import express from "express";
import axios from "axios";
import { JSDOM, VirtualConsole } from "jsdom";
import { Article, Prisma, PrismaClient } from "@prisma/client";
import LLMService from "../services/llm";

const router = express.Router();
const prisma = new PrismaClient();

const userAgent =
  "Mozilla/5.0 (X11; U; Linux armv7l like Android; en-us) AppleWebKit/531.2+ (KHTML, like Gecko) Version/5.0 Safari/533.2+ Kindle/3.0+";

const cookieName = "weread-token";

const virtualConsole = new VirtualConsole();

router.get("/loginQrCode", async (req, res) => {
  try {
    const {
      data: { uid },
    } = await axios.get(
      "https://weread.qq.com/wrwebsimplenjlogic/api/getuid?platform=desktop",
      {
        headers: {
          "User-Agent": userAgent,
        },
      }
    );
    res.json({
      url: `https://weread.qq.com/web/confirm?pf=2&uid=${uid}`,
      uid,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong");
  }
});

router.get("/loginInfo", async (req, res) => {
  try {
    const { uid } = req.query;
    const cgiKey = Math.floor(Math.random() * 1e3);
    const {
      data: { skey, vid, code },
    } = await axios.post(
      "https://weread.qq.com/wrwebsimplenjlogic/api/getlogininfo?platform=desktop",
      {
        cgiKey,
        uid,
      },
      {
        headers: {
          "User-Agent": userAgent,
        },
        timeout: 30 * 1000,
      }
    );
    const resp = await axios.post(
      "https://weread.qq.com/wrwebsimplenjlogic/api/weblogin",
      {
        vid,
        skey,
        code,
        isAutoLogout: 0,
        pf: 2,
        cgiKey,
        fp: 149551496,
      }
    );
    const { accessToken, refreshToken } = resp.data;
    let cookies: string[] = [];
    resp.headers["set-cookie"]?.forEach((cookie) => {
      console.log("cookie", cookie);
      cookies.push(cookie.split(";")[0]);
    });
    const cookie = cookies.join(";");
    res.cookie(cookieName, cookie, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    await prisma.account.upsert({
      where: {
        vid,
      },
      create: {
        vid,
        cookie,
        accessToken,
        refreshToken,
      },
      update: {
        cookie,
        accessToken,
        refreshToken,
      },
    });
    res.end("ok");
  } catch (error) {
    console.error(error);
    res.status(500).end("error");
  }
});

// 获取最新的公众号列表
router.get("/shelf", async (req, res) => {
  let shelfDom: JSDOM | null = null;
  try {
    const cookie = req.cookies?.[cookieName];
    const url = "https://weread.qq.com/wrwebsimplenjlogic/shelf";
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": userAgent,
        cookie,
      },
      withCredentials: true,
    });
    shelfDom = new JSDOM(data, {
      runScripts: "dangerously",
      url,
      virtualConsole
    });
    const books = shelfDom.window.__NUXT__.state.shelf?.books ?? [];
    if (books.length === 0) {
      res
        .status(503)
        .header("Content-Type", "text/html; charset=utf-8")
        .end("登录失效, 或未在微信读书添加公众号", "utf-8");
      return;
    }
    const mpBooks = books
      .filter((book: any) => book.bookId.startsWith("MP"))
      .map((book: any) => {
        return {
          bookId: book.bookId,
          title: book.title,
          cover: book.cover,
        };
      });
    await Promise.all(
      mpBooks.map(async (book: any) => {
        await prisma.mpBook.upsert({
          where: {
            bookId: book.bookId,
          },
          create: {
            ...book,
          },
          update: {
            ...book,
          },
        });
      })
    );
    res.json(mpBooks);
  } catch (error) {
    console.error(error);
    res.end("error").status(500);
  } finally {
    if (shelfDom?.window) {
      shelfDom.window.close();
    }
  }
});

async function fetchReviewId(bookId: string, cookie: string) {
  const { data: reviewId } = await axios.get<string>(
    `https://weread.qq.com/wrwebsimplenjlogic/api/reviewId?bookId=${bookId}&platform=desktop`,
    {
      headers: {
        "User-Agent": userAgent,
        cookie,
      },
      withCredentials: true,
      transformResponse: (data) => data,
    }
  );
  // console.log("reviewId", reviewId);
  // {"succ":0,"errCode":-2012,"errMsg":"{\"message\":\"Request failed with status code 401\"  需要打开微信读书
  return reviewId;
}

// 获取最新文章目录
router.get("/article/:bookId", async (req, res) => {
  let articleDom: JSDOM | null = null;
  try {
    const { bookId } = req.params;
    const cookie = req.cookies?.[cookieName];
    const reviewId = await fetchReviewId(bookId, cookie);
    if (reviewId.indexOf("Request failed") > -1) {
      res
        .status(503)
        .header("Content-Type", "text/html; charset=utf-8")
        .end("微信接口错误，尝试手机打开微信读书APP后重试", "utf-8");
      return;
    }

    const url = `https://weread.qq.com/wrwebsimplenjlogic/mpdetail?reviewId=${reviewId}&fs=2`;
    const { data: article } = await axios.get(url, {
      headers: {
        "User-Agent": userAgent,
        cookie,
      },
      withCredentials: true,
    });
    articleDom = new JSDOM(article, {
      runScripts: "dangerously",
      url,
      virtualConsole
    });
    const { mpChaptersInfo } = articleDom.window.__NUXT__.state.mpdetail;

    const chapters = (mpChaptersInfo as any[])
      .map((chapter: any) => ({
        title: chapter.mpInfo.title,
        pic: chapter.mpInfo.pic_url,
        reviewId: chapter.reviewId,
        publishAt: new Date(chapter.createTime * 1e3),
        mpBookId: bookId,
      }))
      .slice(0, 15);
    await Promise.all(
      chapters.map(async (chapter: any) => {
        await prisma.article.upsert({
          where: {
            reviewId: chapter.reviewId,
          },
          create: {
            ...chapter,
          },
          update: {
            ...chapter,
          },
        });
      })
    );
    res.json(chapters);
  } catch (error) {
    console.error(error);
    res.status(500).end("error");
  } finally {
    if (articleDom?.window) {
      articleDom.window.close();
    }
  }
});

// inflate article content one by one 
router.patch("/article/:reviewId/content", async (req, res) => {
  const { reviewId } = req.params;
  const cookie = req.cookies?.[cookieName];
  try {
    const article = await prisma.article.findUnique({
      where: {
        reviewId
      }
    })
    if (!article) {
      res.status(404).end("not found");
      return;
    }
    await inflateContent(article, cookie);
    res.status(200).json(
      await prisma.article.findUnique({
        select: {
          id: true,
          reviewId: true,
          title: true,
          publishAt: true,
          contentText: true,
          contentPage: true,
          author: true,
          url: true,
          summary: true,
          mpBookId: true,
          mpBook: {
            select: {
              title: true,
            },
          },
        },
        where: {
          reviewId
        }
      })
    );
  } catch (error) {
    console.error(error);
    res.status(500).end("error");
  }
});


// 填充文章详细内容
router.put("/inflate", async (req, res) => {
  try {
    const { bookId } = req.query;
    const cookie = req.cookies?.[cookieName];
    const where: Prisma.ArticleWhereInput = {
      url: null,
    };
    if (bookId) {
      where.mpBookId = bookId as string;
      // todo refactor
      const reviewId = await fetchReviewId(bookId as string, cookie);
      if (reviewId.indexOf("Request failed") > -1) {
        res
          .status(503)
          .header("Content-Type", "text/html; charset=utf-8")
          .end("微信接口错误，尝试手机打开微信读书APP后重试", "utf-8");
        return;
      }
    }
    const articles = await prisma.article.findMany({
      where,
      take: 50
    });
    // queue here?
    for (const article of articles) {
      try {
        await inflateContent(article, cookie);
      } catch (error) {

      }
    }
    res.json("ok");
  } catch (error) {
    console.error(error);
    res.status(500).end("error");
  }
});

async function inflateContent(article: Article, cookie: string) {
  let articleDom: JSDOM | null = null;
  try {
    const url = `https://weread.qq.com/wrwebsimplenjlogic/mpdetail?reviewId=${article.reviewId}&fs=2`;
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": userAgent,
        cookie,
      },
      withCredentials: true,
    });
    articleDom = new JSDOM(data, {
      runScripts: "dangerously",
      url,
      virtualConsole
    });

    const jsContent = articleDom.window.document.querySelector("#js_content");
    if (!jsContent) {
      throw new Error("jsContent not found: " + data);
    }

    const author =
      articleDom.window.document
        .querySelector('meta[name="author"]')
        ?.getAttribute("content") ?? "";

    const mpUrl =
      articleDom.window.document
        .querySelector('meta[property="og:url"]')
        ?.getAttribute("content") ?? "";

    const imgs: Array<string> = [];
    jsContent.querySelectorAll("img").forEach((i) => {
      imgs.push(i.dataset.src!);
    });
    const { summary, keywords } = await LLMService.getSummaryAndKeywords(
      jsContent.textContent!
    );

    await prisma.$transaction([
      prisma.article.update({
        where: {
          reviewId: article.reviewId,
        },
        data: {
          contentText: jsContent.textContent,
          contentPage: jsContent.innerHTML,
          author,
          pic: JSON.stringify(imgs),
          url: mpUrl,
          summary,
        },
      }),
      prisma.keyWord.createMany({
        data: keywords.map((k) => ({
          articleId: article.id,
          text: k,
          bookId: article.mpBookId,
        })),
      }),
    ]);
  } finally {
    if (articleDom?.window) {
      articleDom.window.close();
    }
  }
}

export default router;

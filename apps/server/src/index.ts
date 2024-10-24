import { Prisma, PrismaClient } from "@prisma/client";
import express from "express";
import { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import weReadRouter from "./routers/weread";
import "dotenv/config";

// export const errorHandler = (
//   err: Error,
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   console.error(err);
//   res.status(500).send({ errors: [{ message: "Something went wrong" }] });
// };

const prisma = new PrismaClient();
const app = express();
app.use(cookieParser());
app.use(express.json());
// app.use(errorHandler);

app.use("/weread", weReadRouter);

app.get("/mp-books", async (req, res) => {
  const mpBooks = await prisma.mpBook.findMany({
    where: {
      disabled: false,
    }
  });
  res.json(mpBooks);
});

app.get("/articles", async (req, res) => {
  const bookId = req.query.bookId as string;
  const where: Prisma.ArticleWhereInput = {};
  if (bookId) {
    where.mpBookId = bookId;
  }
  const articles = await prisma.article.findMany({
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
      }
    },
    where,
    orderBy: {
      publishAt: "desc",
    },
    take: 50,
  });
  res.json(articles);
});

app.get("/article/:id/keywords", async (req, res) => {
  const id = Number(req.params.id);
  const article = await prisma.keyWord.findMany({
    where: {
      articleId: id,
    },
  });
  res.json(article.map((item) => item.text));
});

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`
🚀 Server ready at: http://localhost:${port}`);
});

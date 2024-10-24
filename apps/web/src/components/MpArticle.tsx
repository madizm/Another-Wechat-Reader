import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import { useStore } from "@/store";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { ReloadIcon } from "@radix-ui/react-icons";
import http from "@/lib/http";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { marked } from "marked";
import { Separator } from "./ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";
import PQueue from "p-queue";

export type MpArticleType = {
  id: number;
  reviewId: string;
  title: string;
  author: string;
  publishAt: string;
  contentText: string | undefined;
  contentPage: string | undefined;
  url: string | undefined;
  summary: string | undefined;
  mpBookId: string;
  mpBook: {
    title: string;
  },
  inflating: boolean;
};

const queue = new PQueue({ concurrency: 3 });

export function MpArticleList({ articles }: { articles: MpArticleType[]|undefined }) {
  const queryClient = useQueryClient();
  const selectedBookId = useStore.use.selectedBookId();
  
  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (article: MpArticleType) => {
      const { data } = await http.patch<MpArticleType>(
        `/api/weread/article/${article.reviewId}/content`
      );
      return data;
    },
    onMutate: async (article) => {
      queryClient.setQueryData(["articles", selectedBookId], (previous: MpArticleType[]) => {
        return previous?.map((a) => (a.reviewId === article.reviewId ? { ...a, inflating: true } : a)) ?? [];
      })
    },
    onSuccess: async (article) => {
      queryClient.setQueryData(["articles", selectedBookId], (previous: MpArticleType[]) => {
        return previous?.map((a) => (a.reviewId === article.reviewId ? { ...article, inflating: false } : a)) ?? [];
      })
    }
  })

  function handleInflateContent() {
    articles?.filter(a => !a.contentText).slice(0, 10).forEach((article) => {
      queue.add(async () => {
        await mutateAsync(article);
      })
    })
  }
  return (
    <>
      <ScrollArea className="h-screen">
        <div className="flex flex-col gap-2 p-4 pt-0">
          <div className="sticky top-0 z-10 bg-background">
            <Button
              className="w-full"
              onClick={handleInflateContent}
              variant="outline"
              disabled={isPending}
            >
              同步文章正文
              <ReloadIcon className={cn("ml-2", isPending && "animate-spin")} />
            </Button>
          </div>
          {articles?.map((article) => (
            <ArticlePreview key={article.reviewId} article={article} />
          ))}
        </div>
      </ScrollArea>
    </>
  );
}

function ArticlePreview({ article }: { article: MpArticleType }) {
  const selectReviewId = useStore.use.setSelectedReviewId();
  const selectedReviewId = useStore.use.selectedReviewId();
  function handleArticleClick(article: MpArticleType) {
    selectReviewId(article.reviewId);
  }
  return (
    <>
      <button
        onClick={() => handleArticleClick(article)}
        className={cn(
          "flex flex-col items-start gap-2 p-3 text-sm text-left transition-all border rounded-lg hover:bg-accent",
          article.reviewId === selectedReviewId && "bg-accent"
        )}
      >
        <div className="flex flex-col w-full gap-1">
          <div className="grid grid-cols-2">
            <div className="font-semibold">{article.title}</div>
            <div className="ml-auto text-xs ">
              {new Date(article.publishAt).toLocaleString()}
            </div>
          </div>
          <div className="text-xs font-medium">{article.mpBook.title} - {article.author}</div>
        </div>
        <div className="text-xs line-clamp-2 text-muted-foreground">
          {article.contentText?.substring(0, 100) ??  (article.inflating ? "同步中..." : "暂未同步正文")}
        </div>
      </button>
    </>
  );
}

export function ArticleContent({ article }: { article: MpArticleType }) {
  const queryClient = useQueryClient();
  const getMarkdown = (FORM_INPUT: string | undefined) => {
    if (FORM_INPUT) {
      const markdown = marked(FORM_INPUT);
      return { __html: markdown };
    }
  };
  const { data: keywords = [] } = useQuery({
    queryKey: ["keywords", article.id],
    queryFn: async () => {
      const { data } = await http.get<string[]>(
        `/api/article/${article.id}/keywords`
      );
      return data;
    },
  });
  useEffect(() => {
    queryClient.invalidateQueries({
      queryKey: ["keywords", article.id],
    });
  }, [article, queryClient]);
  return (
    <>
      <ScrollArea key={article.reviewId} className="h-screen p-4 pt-0">
        <h2 className="flex pb-2 mb-2 text-3xl font-semibold tracking-tight border-b scroll-m-20">
          <a href={article.url} target="_blank">
            {article.title}
          </a>
          {article.url && <ExternalLinkIcon />}
        </h2>
        {article.summary && (
          <Card>
            <CardHeader>
              <CardTitle>摘要</CardTitle>
              <div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {keywords &&
                    keywords.map((keyword) => (
                      <Badge key={keyword} variant="outline">
                        {keyword}
                      </Badge>
                    ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="summary"
                dangerouslySetInnerHTML={getMarkdown(article.summary)}
              />
            </CardContent>
          </Card>
        )}
        <Separator className="my-4" />
        {article.contentPage ? (
          <div
            className="article-content"
            dangerouslySetInnerHTML={{ __html: article.contentPage }}
          />
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            暂未同步正文
          </div>
        )}
      </ScrollArea>
    </>
  );
}

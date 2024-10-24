import { useEffect } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useStore } from "@/store";

import {
  ArticleContent,
  MpArticleList,
  MpArticleType,
} from "@/components/MpArticle";
import { MpBookList } from "@/components/MpBook";
import { LoginQrCode } from "@/components/LoginQrCode";
import { useQuery } from "@tanstack/react-query";
import http from "@/lib/http";

export default function MainPage() {
  const selectedBookId = useStore.use.selectedBookId();
  const reviewId = useStore.use.selectedReviewId();
  const selectReviewId = useStore.use.setSelectedReviewId();

  const { data: articles } = useQuery({
    queryKey: ["articles", selectedBookId],
    queryFn: async () => {
      const { data } = await http.get<MpArticleType[]>(
        `/api/articles?bookId=${selectedBookId}`
      );
      return data.map((article) => ({ ...article, inflating: false }));
    }
  })

  const selectedArticle = articles?.find(
    (article) => article.reviewId === reviewId
  );
  useEffect(() => {
    if (articles && articles.length > 0 && !selectedArticle) {
      selectReviewId(articles[0].reviewId);
    }
  }, [articles, selectReviewId, selectedArticle]);
  return (
    <div className="flex justify-between">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={15} minSize={5}>
          <MpBookList />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={30} minSize={10}>
          <MpArticleList articles={articles} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={55}>
          {selectedArticle ? (
            <ArticleContent article={selectedArticle} />
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No Article Selected
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
      <LoginQrCode />
    </div>
  );
}

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { useStore } from "@/store";
import { Separator } from "@/components/ui/separator";
import PQueue from "p-queue";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import http from "@/lib/http";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

export type MpBookType = {
  bookId: string;
  title: string;
  cover: string;
  refreshing: boolean;
};

function MpBook({ book }: { book: MpBookType }) {
  const { title, cover, bookId, refreshing } = book;
  const selectBookId = useStore.use.setSelectedBookId();
  const selectedBookId = useStore.use.selectedBookId();
  function handleBookClick(book: MpBookType) {
    selectBookId(book.bookId);
  }
  return (
    <div
      className={cn(
        "p-2 cursor-pointer hover:bg-muted",
        bookId === selectedBookId && "bg-muted"
      )}
      onClick={() => handleBookClick(book)}
    >
      <div className="flex items-center gap-4">
        <Avatar className={cn("h-9 w-9 sm:flex", refreshing && "animate-spin")}>
          <AvatarImage src={cover} alt={title} />
          <AvatarFallback>{title}</AvatarFallback>
        </Avatar>
        <div className="flex-col hidden gap-1 md:flex">
          <p className="text-sm font-medium leading-none">{title}</p>
        </div>
      </div>
    </div>
  );
}

const controller = new AbortController();

function queryShelf() {
  return http.get<MpBookType[]>("/api/weread/shelf").then((res) => {
    useStore.getState().setNeedLogin(false);
    return res.data;
  });
}

function queryArticles(bookId: string) {
  if (!bookId) Promise.resolve();
  return http
    .get(`/api/weread/article/${bookId}`, {
      signal: controller.signal,
    })
    .then((res) => {
      console.dir(res.data);
      useStore.getState().setNeedLogin(false);
    })
    .catch(() => {
      controller.abort();
    });
}

const queue = new PQueue({ concurrency: 5 });

export function MpBookList() {
  const queryClient = useQueryClient();
  const { data: books } = useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const { data } = await http.get<MpBookType[]>("/api/mp-books");
      return data.map((book) => ({ ...book, refreshing: false }));
    }
  });
  const mutateBooks = useMutation({
    mutationFn: queryShelf,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });
  const mutateArticles = useMutation({
    mutationFn: (book: MpBookType) => {
      return queryArticles(book.bookId);
    },
    onMutate: (book) => {
      queryClient.setQueryData(["books"], (previous: MpBookType[]) => {
        return previous?.map((b) => (b.bookId === book.bookId ? {...book, refreshing: true} : b)) ?? [];
      })
    },
    onSuccess: (_, book) => {
      queryClient.setQueryData(["books"], (previous: MpBookType[]) => {
        return previous?.map((b) => (b.bookId === book.bookId ? {...book, refreshing: false} : b)) ?? [];
      })
      queryClient.invalidateQueries({ queryKey: ["articles", book.bookId] });
    },
  });
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    queue.on("idle", () => {
      // invalidate all articles query cache
      queryClient.invalidateQueries({ queryKey: ["articles", ""] });
      setRefreshing(false);
    });
    return () => {
      queue.removeListener("idle");
      queue.clear();
    }
  }, [queryClient]);
  async function refreshShelf() {
    setRefreshing(true);
    try {
      await mutateBooks.mutateAsync();
      if(!books) return;
      for (const book of books) {
        queue.add(() => mutateArticles.mutateAsync(book));
      }
    } catch (error) {
      console.error(error);
      setRefreshing(false);
    }
  }
  return (
    <ScrollArea className="h-screen">
      <div className="flex flex-col gap-2">
        <div className="flex items-center flex-1">
          <MpBook
            key={"all"}
            book={{ bookId: "", title: "All Books", cover: "", refreshing }}
          />

          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  disabled={refreshing}
                  onClick={refreshShelf}
                  variant="outline"
                  size={"icon"}
                  className="ml-auto mr-1"
                >
                  <ReloadIcon className={cn(refreshing && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>刷新公众号和文章目录</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Separator />
        {books?.map((book) => (
          <MpBook key={book.bookId} book={book} />
        ))}
        <Separator />
      </div>
    </ScrollArea>
  );
}

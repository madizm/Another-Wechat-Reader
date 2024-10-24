-- CreateTable
CREATE TABLE "Account" (
    "vid" BIGINT NOT NULL PRIMARY KEY,
    "cookie" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT
);

-- CreateTable
CREATE TABLE "MpBook" (
    "bookId" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "cover" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "disabled" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Article" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "pic" TEXT NOT NULL,
    "author" TEXT,
    "publishAt" DATETIME,
    "contentText" TEXT,
    "contentPage" TEXT,
    "url" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "mpBookId" TEXT NOT NULL,
    "summary" TEXT,
    CONSTRAINT "Article_mpBookId_fkey" FOREIGN KEY ("mpBookId") REFERENCES "MpBook" ("bookId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KeyWord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "text" TEXT NOT NULL,
    "articleId" INTEGER NOT NULL,
    "bookId" TEXT NOT NULL,
    CONSTRAINT "KeyWord_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "MpBook" ("bookId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "KeyWord_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_cookie_key" ON "Account"("cookie");

-- CreateIndex
CREATE UNIQUE INDEX "MpBook_title_key" ON "MpBook"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Article_reviewId_key" ON "Article"("reviewId");

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monitoringEnabled" BOOLEAN NOT NULL DEFAULT false,
    "monitoringFrequency" TEXT NOT NULL DEFAULT '24h'
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "performance" REAL NOT NULL,
    "accessibility" REAL NOT NULL,
    "bestPractices" REAL NOT NULL,
    "seo" REAL NOT NULL,
    "device" TEXT NOT NULL DEFAULT 'mobile',
    "rawJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Site_url_key" ON "Site"("url");

-- CreateIndex
CREATE INDEX "Report_siteId_idx" ON "Report"("siteId");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

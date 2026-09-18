/*
  Warnings:

  - You are about to drop the `Weather` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `type` on the `City` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Weather_cityId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Weather";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "WeatherReport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pm10" REAL DEFAULT 0,
    "pm25" REAL DEFAULT 0,
    "ozone" REAL DEFAULT 0,
    "methane" REAL DEFAULT 0,
    "temp" REAL NOT NULL,
    "sources" TEXT NOT NULL DEFAULT '{}',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cityId" INTEGER NOT NULL,
    CONSTRAINT "WeatherReport_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_City" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL
);
INSERT INTO "new_City" ("id", "lat", "lng", "name", "state") SELECT "id", "lat", "lng", "name", "state" FROM "City";
DROP TABLE "City";
ALTER TABLE "new_City" RENAME TO "City";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

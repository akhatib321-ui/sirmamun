-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR NOT NULL,
    "parentId" VARCHAR,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_7cc1c9e3853b94816c094825e74" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR NOT NULL,
    "uom" VARCHAR NOT NULL,
    "desc" VARCHAR DEFAULT '',
    "supplier" VARCHAR DEFAULT '',
    "lowAt" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_ba5885359424c15ca6b9e79bcf6" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "iid" VARCHAR NOT NULL,
    "lid" VARCHAR NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_092bc1fc7d860426a1dec5aa8e9" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "ts" BIGINT NOT NULL,
    "type" VARCHAR NOT NULL,
    "iid" VARCHAR NOT NULL,
    "userId" VARCHAR,
    "userName" VARCHAR,
    "lid" VARCHAR,
    "delta" INTEGER,
    "fromQty" INTEGER,
    "toQty" INTEGER,
    "note" VARCHAR,
    "fromLid" VARCHAR,
    "toLid" VARCHAR,
    "qty" INTEGER,

    CONSTRAINT "PK_350604cbdf991d5930d9e618fbd" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" SERIAL NOT NULL,
    "config" TEXT NOT NULL,

    CONSTRAINT "PK_4800b266ba790931744b3e53a74" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR NOT NULL,
    "pin" VARCHAR NOT NULL,
    "role" VARCHAR NOT NULL DEFAULT 'staff',
    "locationIds" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UQ_227023051ab1fedef7a3b6c7e2a" ON "locations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "IDX_0db21d48ccb598ce99c0921117" ON "stock"("iid", "lid");


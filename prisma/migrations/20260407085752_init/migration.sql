/*
  Warnings:

  - You are about to drop the `Comment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Post` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `firstName` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `Comment` DROP FOREIGN KEY `Comment_postId_fkey`;

-- DropForeignKey
ALTER TABLE `Post` DROP FOREIGN KEY `Post_userId_fkey`;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `lastName` VARCHAR(191) NULL,
    ADD COLUMN `phone` VARCHAR(191) NULL,
    ADD COLUMN `profileImage` VARCHAR(191) NULL,
    MODIFY `role` ENUM('USER', 'RESTAURANT', 'ADMIN') NOT NULL DEFAULT 'USER',
    MODIFY `firstName` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `Comment`;

-- DropTable
DROP TABLE `Post`;

-- CreateTable
CREATE TABLE `Restaurant` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `address` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `image` VARCHAR(191) NULL,
    `averageRating` DOUBLE NOT NULL DEFAULT 0.0,
    `isOpen` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Restaurant_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Dish` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `image` VARCHAR(191) NULL,
    `category` ENUM('APPETIZER', 'MAIN_COURSE', 'DESSERT', 'BEVERAGE', 'SIDE_DISH') NOT NULL,
    `available` BOOLEAN NOT NULL DEFAULT true,
    `preparationTime` INTEGER NULL,
    `calories` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `totalPrice` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `deliveryAddress` VARCHAR(191) NOT NULL,
    `deliveryCity` VARCHAR(191) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `estimatedTime` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` DECIMAL(10, 2) NOT NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `specialInstructions` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `dishId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `OrderItem_orderId_dishId_key`(`orderId`, `dishId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Rating` (
    `id` VARCHAR(191) NOT NULL,
    `score` INTEGER NOT NULL,
    `comment` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Rating_userId_restaurantId_key`(`userId`, `restaurantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Restaurant` ADD CONSTRAINT `Restaurant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dish` ADD CONSTRAINT `Dish_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `Restaurant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `Restaurant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_dishId_fkey` FOREIGN KEY (`dishId`) REFERENCES `Dish`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Rating` ADD CONSTRAINT `Rating_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Rating` ADD CONSTRAINT `Rating_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `Restaurant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - Made the column `vl_preco` on table `dispositivo` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `dispositivo` MODIFY `vl_preco` DECIMAL(10, 2) NOT NULL;

CREATE TABLE `deposit_bonuses` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `userid` varchar(36) NOT NULL,
    `bonusid` bigint(32) NOT NULL,
    `amount` decimal(32,5) NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;
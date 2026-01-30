CREATE TABLE `crash_rolls` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `ended` bigint(32) NOT NULL DEFAULT 0,
    `point` decimal(32,2) NOT NULL,
    `seedid` bigint(32) NOT NULL,
    `nonce` bigint(32) NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;
CREATE TABLE `email_verification` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `removed` bigint(32) NOT NULL DEFAULT 0,
    `userid` varchar(36) NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;
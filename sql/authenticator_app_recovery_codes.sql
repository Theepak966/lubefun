CREATE TABLE `authenticator_app_recovery_codes` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `removed` bigint(32) NOT NULL DEFAULT 0,
    `used` bigint(32) NOT NULL DEFAULT 0,
    `code` varchar(256) NOT NULL,
    `appid` bigint(32) NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;
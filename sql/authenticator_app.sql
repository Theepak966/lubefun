CREATE TABLE `authenticator_app` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `removed` bigint(32) NOT NULL DEFAULT 0,
    `activated` bigint(32) NOT NULL DEFAULT 0,
    `userid` varchar(36) NOT NULL,
    `secret` varchar(256) NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;
CREATE TABLE `email_history` (
    `id` bigint(32) NOT NULL AUTO_INCREMENT,
    `email` text NOT NULL,
    `subject` text NOT NULL,
    `message` text NOT NULL,
    `time` bigint(32) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf16 COLLATE=utf16_general_ci;
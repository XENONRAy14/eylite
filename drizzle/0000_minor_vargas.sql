CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`record_id` text NOT NULL,
	`before` text,
	`after` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_tenant_created` ON `audit` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `records` (
	`tenant_id` text NOT NULL,
	`id` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`tenant_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `records_tenant_kind` ON `records` (`tenant_id`,`kind`);
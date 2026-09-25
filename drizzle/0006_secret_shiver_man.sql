CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`student_assignment_id` text,
	`recipient_user_id` text,
	`audience` text NOT NULL,
	`type` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`message` text NOT NULL,
	`read_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_assignment_id`) REFERENCES `student_cned_assignments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notifications_dedupe` ON `notifications` (`organization_id`,`dedupe_key`);--> statement-breakpoint
CREATE INDEX `notifications_org_audience` ON `notifications` (`organization_id`,`audience`,`created_at`);
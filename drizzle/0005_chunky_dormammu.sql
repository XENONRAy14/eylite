CREATE TABLE `cned_assignment_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`template_subject_id` text NOT NULL,
	`reference` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`official_due_date` text,
	FOREIGN KEY (`template_subject_id`) REFERENCES `cned_template_subjects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cned_defs_subject_ref` ON `cned_assignment_definitions` (`template_subject_id`,`reference`);--> statement-breakpoint
CREATE INDEX `cned_defs_subject` ON `cned_assignment_definitions` (`template_subject_id`);--> statement-breakpoint
CREATE TABLE `cned_group_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`group_id` text NOT NULL,
	`assignment_definition_id` text NOT NULL,
	`target_date` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `class_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignment_definition_id`) REFERENCES `cned_assignment_definitions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cned_group_sched_unique` ON `cned_group_schedules` (`group_id`,`assignment_definition_id`);--> statement-breakpoint
CREATE TABLE `cned_status_events` (
	`id` text PRIMARY KEY NOT NULL,
	`student_assignment_id` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`source` text NOT NULL,
	`actor_user_id` text,
	`note` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`student_assignment_id`) REFERENCES `student_cned_assignments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cned_events_assignment` ON `cned_status_events` (`student_assignment_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `cned_template_subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`name` text NOT NULL,
	`owner_teacher_id` text,
	`state` text DEFAULT 'to_fill' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `cned_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cned_subjects_template_name` ON `cned_template_subjects` (`template_id`,`name`);--> statement-breakpoint
CREATE INDEX `cned_subjects_teacher` ON `cned_template_subjects` (`owner_teacher_id`);--> statement-breakpoint
CREATE TABLE `cned_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`school_year_id` text NOT NULL,
	`name` text NOT NULL,
	`level` text,
	`formula` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`source_template_id` text,
	`created_at` text NOT NULL,
	`published_at` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`school_year_id`) REFERENCES `school_years`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cned_templates_year_name_version` ON `cned_templates` (`school_year_id`,`name`,`version`);--> statement-breakpoint
CREATE INDEX `cned_templates_org` ON `cned_templates` (`organization_id`);--> statement-breakpoint
CREATE TABLE `student_cned_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`enrollment_id` text NOT NULL,
	`assignment_definition_id` text NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`target_date` text,
	`target_override` integer DEFAULT false NOT NULL,
	`declared_sent_at` text,
	`declared_by` text,
	`verified_by` text,
	`verified_at` text,
	`corrected_at` text,
	`score` text,
	`help_requested` integer DEFAULT false NOT NULL,
	`last_event_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`enrollment_id`) REFERENCES `student_cned_enrollments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignment_definition_id`) REFERENCES `cned_assignment_definitions`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sca_enrollment_def` ON `student_cned_assignments` (`enrollment_id`,`assignment_definition_id`);--> statement-breakpoint
CREATE INDEX `sca_org_status` ON `student_cned_assignments` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `student_cned_enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`student_id` text NOT NULL,
	`template_id` text NOT NULL,
	`school_year_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `cned_templates`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`school_year_id`) REFERENCES `school_years`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cned_enroll_student_template` ON `student_cned_enrollments` (`student_id`,`template_id`);--> statement-breakpoint
CREATE INDEX `cned_enroll_org` ON `student_cned_enrollments` (`organization_id`);--> statement-breakpoint
CREATE TABLE `student_cned_subjects` (
	`enrollment_id` text NOT NULL,
	`template_subject_id` text NOT NULL,
	PRIMARY KEY(`enrollment_id`, `template_subject_id`),
	FOREIGN KEY (`enrollment_id`) REFERENCES `student_cned_enrollments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_subject_id`) REFERENCES `cned_template_subjects`(`id`) ON UPDATE no action ON DELETE cascade
);

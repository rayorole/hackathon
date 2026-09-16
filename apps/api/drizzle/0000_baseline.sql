CREATE TABLE "accepted_corrections" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"ondernemingsnr" text NOT NULL,
	"field" text NOT NULL,
	"value" text NOT NULL,
	"medewerker" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accepted_corrections_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE TABLE "audit" (
	"id" text PRIMARY KEY NOT NULL,
	"ondernemingsnr" text NOT NULL,
	"beoordeling" text NOT NULL,
	"medewerker" text NOT NULL,
	"opmerking" text,
	"bewijs_snapshot" jsonb NOT NULL,
	"proposal_snapshot" jsonb,
	"beslist_op" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"ondernemingsnr" text NOT NULL,
	"signal" text NOT NULL,
	"source" text NOT NULL,
	"source_url" text,
	"observation" text NOT NULL,
	"observed_at" text NOT NULL,
	"direction" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "records" (
	"ondernemingsnr" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"zetel_ondernemingsnr" text,
	"zetel_elders" boolean DEFAULT false NOT NULL,
	"naam" text,
	"commerciele_naam" text,
	"rechtsvorm" text,
	"rechtstoestand" text,
	"straat" text,
	"huisnr" text,
	"busnr" text,
	"postcode" text,
	"gemeente" text,
	"ar_straat" text,
	"ar_huisnr" text,
	"ar_postcode" text,
	"nace_rsz" text,
	"omschrijving_rsz" text,
	"telefoon" text,
	"email" text,
	"datum_inschrijving" text,
	"startdatum" text,
	"datum_stopzetting" text,
	"longitude" double precision,
	"latitude" double precision,
	"coordinaat_verdacht" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"ondernemingsnr" text NOT NULL,
	"officer_id" text NOT NULL,
	"status" text NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"result" jsonb,
	"usage" jsonb,
	"error" text,
	"decision" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"ondernemingsnr" text PRIMARY KEY NOT NULL,
	"score" integer NOT NULL,
	"zekerheid" text NOT NULL,
	"voorstel" text NOT NULL,
	"redenen" jsonb NOT NULL,
	"laatste_waarneming" text,
	"berekend_op" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accepted_corrections" ADD CONSTRAINT "accepted_corrections_run_id_research_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."research_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accepted_corrections" ADD CONSTRAINT "accepted_corrections_ondernemingsnr_records_ondernemingsnr_fk" FOREIGN KEY ("ondernemingsnr") REFERENCES "public"."records"("ondernemingsnr") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_ondernemingsnr_records_ondernemingsnr_fk" FOREIGN KEY ("ondernemingsnr") REFERENCES "public"."records"("ondernemingsnr") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_runs" ADD CONSTRAINT "research_runs_ondernemingsnr_records_ondernemingsnr_fk" FOREIGN KEY ("ondernemingsnr") REFERENCES "public"."records"("ondernemingsnr") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_ondernemingsnr_records_ondernemingsnr_fk" FOREIGN KEY ("ondernemingsnr") REFERENCES "public"."records"("ondernemingsnr") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_record_idx" ON "audit" USING btree ("ondernemingsnr");--> statement-breakpoint
CREATE INDEX "evidence_record_idx" ON "evidence" USING btree ("ondernemingsnr");--> statement-breakpoint
CREATE INDEX "records_straat_idx" ON "records" USING btree ("straat");--> statement-breakpoint
CREATE INDEX "records_kind_idx" ON "records" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "research_runs_record_idx" ON "research_runs" USING btree ("ondernemingsnr");--> statement-breakpoint
CREATE UNIQUE INDEX "research_one_active_record" ON "research_runs" USING btree ("ondernemingsnr") WHERE "research_runs"."status" = 'running';--> statement-breakpoint
CREATE UNIQUE INDEX "research_one_active_officer" ON "research_runs" USING btree ("officer_id") WHERE "research_runs"."status" = 'running';
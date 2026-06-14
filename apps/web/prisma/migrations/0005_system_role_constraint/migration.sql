-- Epic 11 code review fix: constrain system_role to known values only
ALTER TABLE "users" ADD CONSTRAINT "users_system_role_check"
  CHECK (system_role IS NULL OR system_role IN ('super_admin'));

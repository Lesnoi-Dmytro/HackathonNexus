import { CreateUsersTable1777766400000 } from "./1777766400000-CreateUsersTable";
import { AddRoleAndParticipant1777766500000 } from "./1777766500000-AddRoleAndParticipant";
import { CreateHackathonsTable1777766600000 } from "./1777766600000-CreateHackathonsTable";
import { CreateTeamsTable1777766700000 } from "./1777766700000-CreateTeamsTable";
import { CreateTeamRequestsTable1777766800000 } from "./1777766800000-CreateTeamRequestsTable";
import { CreateNotificationsTable1777766900000 } from "./1777766900000-CreateNotificationsTable";
import { AddYearsOfExperienceToParticipants1777767000000 } from "./1777767000000-AddYearsOfExperienceToParticipants";
import { AddHackathonRegistrations1777767100000 } from "./1777767100000-AddHackathonRegistrations";
import { SeedData1777767200000 } from "./1777767200000-SeedData";
import { CreateMessagesTable1777767300000 } from "./1777767300000-CreateMessagesTable";

export const typeormMigrations = [
  CreateUsersTable1777766400000,
  AddRoleAndParticipant1777766500000,
  CreateHackathonsTable1777766600000,
  CreateTeamsTable1777766700000,
  CreateTeamRequestsTable1777766800000,
  CreateNotificationsTable1777766900000,
  AddYearsOfExperienceToParticipants1777767000000,
  AddHackathonRegistrations1777767100000,
  SeedData1777767200000,
  CreateMessagesTable1777767300000,
];

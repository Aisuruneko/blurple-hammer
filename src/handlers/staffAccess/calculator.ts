import type { Client, Snowflake } from "discord.js";
import { Access } from "../../constants/subservers";
import type { Subserver } from "../../constants/subservers";
import { SubserverAccessOverride } from "../../database/models/SubserverAccessOverride";
import { UserStrip } from "../../database/models/UserStrip";
import config from "../../config";

export default async function calculateAccess(userId: Snowflake, subserver: Subserver, client: Client): Promise<{ access: Access; applicableRoles: Snowflake[]; prohibitedRoles: Snowflake[] }> {
  const member = await client.guilds.cache.get(config.guildId)!.members.fetch({ user: userId, force: false }).catch(() => null);
  if (!member) return { access: Access.Denied, applicableRoles: [], prohibitedRoles: []};

  const override = await SubserverAccessOverride.findOne({ userId, subserverId: subserver.id });
  if (override) return { access: Access.Allowed, applicableRoles: subserver.userOverrideNoticeRoleId ? [subserver.userOverrideNoticeRoleId] : [], prohibitedRoles: []};

  const userStrip = await UserStrip.findOne({ userId });
  const allUserOrRoleIdsApplicable = [
    member.id,
    ...member.roles.cache.map(role => role.id),
    ...userStrip?.roleIds ?? [],
  ];

  const allEntries = Object.entries(subserver.staffAccess);
  const applicableEntries = allEntries.filter(([userOrRoleId]) => allUserOrRoleIdsApplicable.includes(userOrRoleId)).map(([, access]) => access);
  const otherManagedEntries = allEntries.map(([, access]) => access).filter(access => !applicableEntries.some(entry => entry === access));

  const access = applicableEntries.reduce((previous, { access: current = Access.Denied }) => current > previous ? current : previous, Access.Denied);
  const applicableRoles = applicableEntries.reduce<Snowflake[]>((previous, { roles = []}) => previous.concat(roles), []).filter((role, index, array) => array.indexOf(role) === index);
  const prohibitedRoles = otherManagedEntries.reduce<Snowflake[]>((previous, { roles = []}) => previous.concat(roles), []).filter((role, index, array) => array.indexOf(role) === index);
  if (subserver.userOverrideNoticeRoleId) prohibitedRoles.push(subserver.userOverrideNoticeRoleId);

  return { access, applicableRoles, prohibitedRoles };
}

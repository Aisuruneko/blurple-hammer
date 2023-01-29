import { refreshAllSubserverAccess, refreshSubserverAccess } from "./subservers/access/refresh";
import type { Client } from "discord.js";
import { SubserverAccessOverride } from "../../database/models/SubserverAccessOverride";

export default function handleServerPolicies(client: Client<true>): void {
  refreshAllSubserverAccess(client);

  client.on("guildMemberAdd", member => void refreshSubserverAccess(member.id, client));
  client.on("guildMemberUpdate", member => void refreshSubserverAccess(member.id, client));
  client.on("guildMemberRemove", async member => {
    await SubserverAccessOverride.deleteMany({ userId: member.id, guildId: member.guild.id });
    void refreshSubserverAccess(member.id, client);
  });
}

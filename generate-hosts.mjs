// Schreibt app/src/main/res/values/hosts.xml: Domains, denen die TWA vertraut
// (keine Wildcards möglich). Quelle: /api/store-app-hosts der Live-Seite,
// TWA_EXTRA_HOSTS (Komma) ergänzt Hosts für Testbuilds.
// Aufruf: bun generate-hosts.mjs
import { writeFileSync } from "node:fs"

let hosts = ["muehlen.app", "milk.muehlen.app"]
try {
	const res = await fetch("https://muehlen.app/api/store-app-hosts?domain=muehlen.app")
	if (!res.ok) throw new Error(`Status ${res.status}`)
	hosts = (await res.json()).hosts
} catch (e) {
	console.warn(`Hosts nicht abrufbar (${e.message}), nehme ${hosts.join(", ")}`)
}
const extra = (process.env.TWA_EXTRA_HOSTS || "").split(",").map((h) => h.trim()).filter(Boolean)
const alle = [...new Set([...hosts, ...extra])]
if (!alle.includes("muehlen.app")) throw new Error("muehlen.app fehlt")

const statement = (host) =>
	`{\\"relation\\":[\\"delegate_permission/common.handle_all_urls\\"],\\"target\\":{\\"namespace\\":\\"web\\",\\"site\\":\\"https://${host}\\"}}`
const xml = `<?xml version="1.0" encoding="utf-8"?>
<!-- Erzeugt von generate-hosts.mjs, nicht von Hand bearbeiten -->
<resources>
    <string name="asset_statements" translatable="false">[${alle.map(statement).join(",")}]</string>
    <string-array name="additional_trusted_origins">
${alle.map((h) => `        <item>https://${h}</item>`).join("\n")}
    </string-array>
</resources>
`
writeFileSync(new URL("./app/src/main/res/values/hosts.xml", import.meta.url), xml)
console.log(`hosts.xml: ${alle.join(", ")}`)

// Trägt den Store-Eintrag der Mühlen.app in Google Play über die
// Play-Developer-API ein: Texte, Symbol, Kopfgrafik und Screenshots aus
// fastlane/metadata/android (wie F-Droid), dazu die Kontaktdaten.
// Braucht ~/.secrets/play-service-account.json (Dienstkonto mit den Rechten
// „Store-Präsenz verwalten“ und, solange die App unveröffentlicht ist,
// „Entwurfs-Apps bearbeiten“) und eine angelegte App mit erstem AAB. Nicht über die API: Datensicherheit, Altersfreigabe (IARC),
// Zielgruppe, Werbung, App-Zugriff; das geht nur in der Play Console.
// Aufruf: bun play-metadata.mjs
import { createSign } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import { homedir } from "node:os"

const PAKET = "app.muehlen"
const KONTO = JSON.parse(readFileSync(`${homedir()}/.secrets/play-service-account.json`, "utf8"))
const KONTAKT = {
	contactEmail: "info@erleben.app",
	contactPhone: "+4957459109000",
	contactWebsite: "https://muehlen.app/",
}
// Texte und Bilder aus fastlane/ (dieselben liest F-Droid)
const META = new URL("./fastlane/metadata/android/", import.meta.url)
const SPRACHEN = ["de-DE"]
const lies = (sprache, datei) => readFileSync(new URL(`${sprache}/${datei}`, META), "utf8").trim()

async function zugang() {
	const b64url = (x) => Buffer.from(x).toString("base64url")
	const jetzt = Math.floor(Date.now() / 1000)
	const kopf = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))
	const inhalt = b64url(
		JSON.stringify({
			iss: KONTO.client_email,
			scope: "https://www.googleapis.com/auth/androidpublisher",
			aud: KONTO.token_uri,
			iat: jetzt,
			exp: jetzt + 3600,
		}),
	)
	const sig = createSign("RSA-SHA256").update(`${kopf}.${inhalt}`).sign(KONTO.private_key)
	const res = await fetch(KONTO.token_uri, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
			assertion: `${kopf}.${inhalt}.${b64url(sig)}`,
		}),
	})
	const json = await res.json()
	if (!res.ok) throw new Error(`Token: ${JSON.stringify(json)}`)
	return json.access_token
}
const TOKEN = await zugang()

const BASIS = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PAKET}`
async function api(pfad, methode = "GET", body) {
	const res = await fetch(`${BASIS}/${pfad}`, {
		method: methode,
		headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
		body: body && JSON.stringify(body),
	})
	const text = await res.text()
	if (!res.ok) throw new Error(`${methode} ${pfad}: ${text}`)
	return text ? JSON.parse(text) : null
}
async function bild(edit, sprache, typ, inhalt) {
	const url = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PAKET}/edits/${edit}/listings/${sprache}/${typ}?uploadType=media`
	const res = await fetch(url, {
		method: "POST",
		headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "image/png" },
		body: inhalt,
	})
	if (!res.ok) throw new Error(`Bild ${typ} ${sprache}: ${await res.text()}`)
}

const edit = (await api("edits", "POST", {})).id
await api(`edits/${edit}/details`, "PUT", { defaultLanguage: "de-DE", ...KONTAKT })


for (const sprache of SPRACHEN) {
	await api(`edits/${edit}/listings/${sprache}`, "PUT", {
		language: sprache,
		title: lies(sprache, "title.txt"),
		shortDescription: lies(sprache, "short_description.txt"),
		fullDescription: lies(sprache, "full_description.txt"),
	})
	// Bilder liegen einmal unter en-US (Rückfall für F-Droid und IzzyOnDroid)
	const bilder = new URL("en-US/images/", META)
	await bild(edit, sprache, "icon", readFileSync(new URL("icon.png", bilder)))
	await api(`edits/${edit}/listings/${sprache}/featureGraphic`, "DELETE")
	await bild(edit, sprache, "featureGraphic", readFileSync(new URL("featureGraphic.png", bilder)))
	const ordner = new URL("phoneScreenshots/", bilder)
	const dateien = readdirSync(ordner).filter((f) => f.endsWith(".png")).sort()
	await api(`edits/${edit}/listings/${sprache}/phoneScreenshots`, "DELETE")
	for (const f of dateien) await bild(edit, sprache, "phoneScreenshots", readFileSync(new URL(f, ordner)))
	console.log(`${sprache}: Texte, Grafiken und ${dateien.length} Screenshots`)
}

await api(`edits/${edit}:commit`, "POST")
console.log("Store-Eintrag übernommen")

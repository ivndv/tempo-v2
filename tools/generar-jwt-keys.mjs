#!/usr/bin/env node
import { randomUUID } from "node:crypto";
// Genera JWT_KEYS y JWT_JWKS (ES256 + legacy HS256) para Supabase self-hosted.
// Uso:
//   node generar-jwt-keys.mjs --env=/ruta/.env --out=/tmp/jwt-keys.txt
//   node generar-jwt-keys.mjs --secret=... --out=/tmp/jwt-keys.txt
import { chmodSync, readFileSync, writeFileSync } from "node:fs";

function arg(nombre) {
	const prefijo = `--${nombre}=`;
	const encontrado = process.argv.find((linea) => linea.startsWith(prefijo));

	return encontrado ? encontrado.slice(prefijo.length) : undefined;
}

function leerSecreto(ruta) {
	const contenido = readFileSync(ruta, "utf8");

	for (const linea of contenido.split("\n")) {
		const limpia = linea.trim();

		if (!limpia || limpia.startsWith("#")) {
			continue;
		}

		const igual = limpia.indexOf("=");

		if (igual === -1) {
			continue;
		}

		const clave = limpia.slice(0, igual).trim();
		const valor = limpia
			.slice(igual + 1)
			.trim()
			.replace(/^["']|["']$/g, "");

		if (clave === "JWT_SECRET") {
			return valor;
		}
	}

	return undefined;
}

const rutaEnv = arg("env");
const secreto =
	arg("secret") ?? process.env.JWT_SECRET ?? (rutaEnv ? leerSecreto(rutaEnv) : undefined);

if (!secreto) {
	console.error("Falta JWT_SECRET. Usa --env=/ruta/.env, --secret=... o expórtalo.");
	process.exit(1);
}

const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
	"sign",
	"verify",
]);

const privada = await crypto.subtle.exportKey("jwk", par.privateKey);
const publica = await crypto.subtle.exportKey("jwk", par.publicKey);
const kid = randomUUID();

// Clave legacy: sin kid ni key_ops, igual que el script oficial de Supabase.
// GoTrue exige key_ops con "sign" en la privada para detectar la clave de firma.
const legacy = {
	kty: "oct",
	k: Buffer.from(secreto, "utf8").toString("base64url"),
	alg: "HS256",
};

const jwtKeys = JSON.stringify([
	{
		kty: privada.kty,
		crv: privada.crv,
		x: privada.x,
		y: privada.y,
		d: privada.d,
		kid,
		use: "sig",
		key_ops: ["sign", "verify"],
		alg: "ES256",
		ext: true,
	},
	legacy,
]);

const jwtJwks = JSON.stringify({
	keys: [
		{
			kty: publica.kty,
			crv: publica.crv,
			x: publica.x,
			y: publica.y,
			kid,
			use: "sig",
			key_ops: ["verify"],
			alg: "ES256",
			ext: true,
		},
		legacy,
	],
});

const salida = `JWT_KEYS=${jwtKeys}\nJWT_JWKS=${jwtJwks}\n`;
const destino = arg("out");

if (destino) {
	writeFileSync(destino, salida, { mode: 0o600 });
	chmodSync(destino, 0o600);
	console.error(`Escrito en ${destino} (chmod 600).`);
}

process.stdout.write(salida);

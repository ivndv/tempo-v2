import { getUsuarioActual } from "@/shared/infrastructure/getUsuarioActual";
import { AppHome } from "./AppHome";

export default async function AppPage() {
	const user = await getUsuarioActual();

	return <AppHome user={user ? { email: user.email } : null} />;
}

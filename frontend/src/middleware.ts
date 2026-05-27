import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register"];

export function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl;
	const token = req.cookies.get("token")?.value;

	const isPublic = PUBLIC_PATHS.some(
		(p) => pathname === p || pathname.startsWith(`${p}/`),
	);

	if (!token && !isPublic) {
		const url = req.nextUrl.clone();
		url.pathname = "/login";
		return NextResponse.redirect(url);
	}

	if (token && pathname === "/login") {
		const url = req.nextUrl.clone();
		url.pathname = "/dashboard";
		return NextResponse.redirect(url);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};

import type { Metadata } from "next";
import { DM_Sans, Syne, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "@/styles/globals.css";

const dmSans = DM_Sans({
	subsets: ["latin"],
	weight: ["300", "400", "500", "600"],
	variable: "--font-dm-sans",
	display: "swap",
});

const syne = Syne({
	subsets: ["latin"],
	weight: ["600", "700", "800"],
	variable: "--font-syne",
	display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	weight: ["400"],
	variable: "--font-jetbrains",
	display: "swap",
});

export const metadata: Metadata = {
	title: "Prisma BI — Inteligência analítica para o varejo",
	description:
		"Cérebro analítico para redes de varejo. ROI, anomalias e projeções em tempo real.",
};

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('prisma-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (_) {}
})();
`;

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html
			lang="pt-BR"
			className={`${dmSans.variable} ${syne.variable} ${jetbrainsMono.variable}`}>
			<head>
				<script dangerouslySetInnerHTML={{ __html: themeScript }} />
			</head>
			<body
				style={{
					fontFamily: "var(--font-dm-sans), var(--font-sans)",
				}}>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}

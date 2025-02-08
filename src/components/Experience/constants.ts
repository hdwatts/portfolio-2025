import ReactLogo from "../../assets/react-logo.svg?url";
import TailwindLogo from "../../assets/tailwind-logo.svg?url";
import ShadcnUrl from "../../assets/shadcn-logo.svg?url";
import AstroLogo from "../../assets/astro-logo.svg?url";
import GitHubLogo from "../../assets/github-logo.svg?url";
import RustLogo from "../../assets/rust-logo.svg?url";
import AwsLogo from "../../assets/aws-logo.svg?url";
import PostgresLogo from "../../assets/postgres-logo.svg?url";
import CSharpLogo from "../../assets/csharp-logo.svg?url";
import RailsLogo from "../../assets/rails-logo.svg?url";
import TypeScriptLogo from "../../assets/typescript-logo.svg?url";
import ExpoLogo from "../../assets/expo-logo.svg?url";
import PerlLogo from "../../assets/perl-logo.svg?url";
import ColdfusionLogo from "../../assets/coldfusion-logo.svg?url";
import ServerlessLogo from '../../assets/serverless-logo.svg?url'
import TauriLogo from '../../assets/tauri-logo.svg?url'
import TrpcLogo from '../../assets/trpc-logo.svg?url'
import type { LogoButtonProps } from "./LogoButton";

export const LOGOS_ROW_HEIGHT = 250;
export const LOGOS_ROW_PADDING = 24;
export const LOGOS_NUM_ROWS = 6;

export const EXPERIENCE_DATA: LogoButtonProps[] = [
    {
        label: "React",
        src: ReactLogo,
        backgroundColor: "rgb(35 39 47)",
        url:'https://react.dev/',
    },
    {
        label: "tailwindcss",
        src: TailwindLogo,
        backgroundColor: "oklch(.13 .028 261.692)",
        url: 'https://tailwindcss.com/',
    },
    {
        label: "shadcn/ui",
        src: ShadcnUrl,
        backgroundColor: "hsl(0 0% 3.9%)",
        url: 'https://ui.shadcn.com/',
    },
    {
        label: "Astro",
        src: AstroLogo,
        backgroundColor: "rgb(23 25 30)",
        url: 'https://astro.build/',
    },
    {
        label: "Rust",
        src: RustLogo,
        backgroundColor: "hsl(0 0% 3.9%)",
        url: 'https://www.rust-lang.org/',
    },
    {
        label: "Rails",
        src: RailsLogo,
        backgroundColor: "#171717",
        url: 'https://rubyonrails.org/',
    },
    {
        label: "AWS",
        src: AwsLogo,
        backgroundColor: "#141f2e",
        url: 'https://aws.amazon.com/',
    },
    {
        label: "GitHub",
        src: GitHubLogo,
        backgroundColor: "#010409",
        url: 'https://github.com'
    },
    {
        label: "Postgres",
        src: PostgresLogo,
        backgroundColor: "#212121",
        url: 'https://www.postgresql.org/',
    },
    {
        label: "C#",
        src: CSharpLogo,
        backgroundColor: "#171717",
        url: 'https://docs.microsoft.com/en-us/dotnet/csharp/',
    },
    {
        label: "TypeScript",
        src: TypeScriptLogo,
        backgroundColor: "#3178c6",
        url: 'https://www.typescriptlang.org/',
    },
    {
        label: "Expo",
        src: ExpoLogo,
        backgroundColor: "#18191b",
        url: 'https://expo.dev/',
    },
    {
        label: "Perl",
        src: PerlLogo,
        backgroundColor: "#18191b",
        url: 'https://www.perl.org/',
    },
    {
        label: "Coldfusion",
        src: ColdfusionLogo,
        backgroundColor: "#171717",
        url: 'https://www.adobe.com/products/coldfusion-family.html',
    },
    {
        label: 'serverless',
        src: ServerlessLogo,
        backgroundColor: "hsl(0 0% 3.9%)",
        url: 'https://www.serverless.com/'
    },
    {
        label: 'Tauri',
        src: TauriLogo,
        backgroundColor: "#181818",
        url: 'https://tauri.app/'
    },
    {
        label: 'tRPC',
        src: TrpcLogo,
        backgroundColor: "#111",
        url: 'https://trpc.io/'
    },
];

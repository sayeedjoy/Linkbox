import { cn } from "@/lib/utils";

export const LogoIcon = (props: React.ComponentProps<"img">) => (
	<img alt="" src="/favicon.ico" {...props} />
);

export const Logo = ({ className, ...props }: React.ComponentProps<"div">) => (
	<div className={cn("flex items-center gap-1.5 font-semibold text-foreground", className)} {...props}>
		<img
			alt=""
			className="size-[1em] shrink-0 object-contain"
			src="/favicon.ico"
		/>
		<span>LinkArena</span>
	</div>
);

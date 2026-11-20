import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COMPONENT_TYPES, CONNECTION_TYPE_LIST } from "@/lib/componentTypes";

export const ConnectionLegend = () => {
	return (
		<Card className="max-lg:hidden w-[202px]">
			<CardContent className="flex flex-col gap-4">
				<section className="space-y-2">
					<h4 className="text-xs font-medium text-foreground">Node Types</h4>
					{COMPONENT_TYPES.map(({ type, label, icon: Icon, bgClass }) => (
						<div key={type} className="flex items-center gap-2">
							<div className={`p-1 rounded text-background ${bgClass}`}>
								<Icon className="w-3 h-3" />
							</div>
							<span className="text-xs text-muted-foreground">{label}</span>
						</div>
					))}
				</section>
				{/*<section className="space-y-2">
					<h4 className="text-xs font-medium text-foreground">Connection Types</h4>
					{CONNECTION_TYPE_LIST.map(({ id, label, swatchClass }) => (
						<div key={id} className="flex items-center gap-2">
							<div className={`w-3 shrink-0 h-0.5 rounded ${swatchClass}`} />
							<span className="text-xs text-muted-foreground">{label}</span>
						</div>
					))}
				</section>*/}
			</CardContent>
		</Card>
	);
};

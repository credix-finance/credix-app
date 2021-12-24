import React from "react";
import { AppLayout } from "./AppLayout";

interface Props {
	children?: React.ReactNode;
}

export const DealLayout = (props: Props) => (
	<AppLayout>
		<div className="container-deals">{props.children}</div>
	</AppLayout>
);

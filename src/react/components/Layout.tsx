import React from 'react';

interface IProps {
	children: React.ReactNode;
}

export const Layout = (props: IProps) => {
	return (
		<div>
			{props.children}
		</div>
	);
};
import React from "react";

interface Props {
	embedId: string;
}

export const Youtube = (props: Props) => (
	<div className="video-responsive">
		<iframe
			width="400"
			height="225"
			src={`https://www.youtube.com/embed/${props.embedId}`}
			frameBorder="0"
			allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
			allowFullScreen
			title="Embedded youtube"
		/>
	</div>
);

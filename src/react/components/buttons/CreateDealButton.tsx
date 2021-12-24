import React from "react";
import { useNavigate } from "react-router-dom";
import { Path } from "types/navigation.types";
import { CredixButton } from "./CredixButton";

export const CreateDealButton = () => {
	const navigate = useNavigate();

	return <CredixButton text="Create deal" onClick={() => navigate(Path.NEW_DEAL)} />;
};

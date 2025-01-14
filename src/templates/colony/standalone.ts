import { ColonyGraphData } from "../../scripts/colony";
import { render } from "./colony";

declare global {
  interface Window {
    colonyData: {
      graphData: ColonyGraphData,
      in3D: boolean,
    }
  }
};

const { graphData, in3D } = window.colonyData;

render(graphData, { in3D });
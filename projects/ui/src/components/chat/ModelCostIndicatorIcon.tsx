import FreeModelIcon from "@mui/icons-material/MoneyOff";
import CostlyModelIcon from "@mui/icons-material/AttachMoney";
import type { AiModelEntity } from "bymx-core/types";

export default function ModelCostIndicatorIcon(props: { model: AiModelEntity.AIModelViewModel }) {
    if (props.model.costRatio === 0)
        return <FreeModelIcon color="disabled" fontSize="small" />;

    const color = ({
        1: "info",
        2: "success",
        3: "success",
        4: "warning",
    } as const)[props.model.costRatio] ?? "error";

    return <CostlyModelIcon color={color} fontSize="small" />;
}

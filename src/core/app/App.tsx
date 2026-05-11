import { Providers } from "./Providers";
import { RootRouter } from "@core/router/RootRouter";

export function App() {
  return (
    <Providers>
      <RootRouter />
    </Providers>
  );
}

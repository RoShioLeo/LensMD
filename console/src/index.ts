import { definePlugin } from "@halo-dev/ui-shared";
import { defineAsyncComponent } from "vue";
import { VLoading } from "@halo-dev/components";

export default definePlugin({
  extensionPoints: {
    "editor:create": () => {
      return [
        {
          // Existing posts store "bytemd" as their preferred editor key.
          name: "bytemd",
          displayName: "LensMD",
          component: defineAsyncComponent({
            loader: () => import("./components/bytemd.vue"),
            loadingComponent: VLoading,
          }),
          rawType: "markdown",
          logo: "/plugins/lensmd/assets/logo-lens.svg",
        },
      ];
    },
  },
});

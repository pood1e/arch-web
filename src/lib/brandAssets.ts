import agentgateway from "@/assets/brands/agentgateway.svg";
import apprise from "@/assets/brands/apprise.png";
import batfish from "@/assets/brands/batfish.png";
import certManager from "@/assets/brands/cert-manager.svg";
import containerlab from "@/assets/brands/containerlab.svg";
import gnmic from "@/assets/brands/gnmic.svg";
import jumpserver from "@/assets/brands/jumpserver.png";
import kagent from "@/assets/brands/kagent.svg";
import kea from "@/assets/brands/kea.png";
import loki from "@/assets/brands/loki.svg";
import netbox from "@/assets/brands/netbox.svg";
import oauth2Proxy from "@/assets/brands/oauth2-proxy.svg";
import phoenix from "@/assets/brands/phoenix.svg";
import postgrest from "@/assets/brands/postgrest.ico";
import redpanda from "@/assets/brands/redpanda.svg";
import seaweedfs from "@/assets/brands/seaweedfs.svg";
import telegraf from "@/assets/brands/telegraf.png";
import tempo from "@/assets/brands/tempo.png";
import valkey from "@/assets/brands/valkey.png";
import zammad from "@/assets/brands/zammad.svg";

export type AssetIcon = {
  asset: { src: string; lightBackground?: boolean };
};

export const BRAND_ICONS: Record<string, AssetIcon> = {
  agentgateway: { asset: { src: agentgateway } },
  apprise: { asset: { src: apprise, lightBackground: true } },
  batfish: { asset: { src: batfish } },
  "cert-manager": { asset: { src: certManager } },
  containerlab: { asset: { src: containerlab, lightBackground: true } },
  gnmic: { asset: { src: gnmic } },
  jumpserver: { asset: { src: jumpserver } },
  kagent: { asset: { src: kagent } },
  kea: { asset: { src: kea, lightBackground: true } },
  loki: { asset: { src: loki } },
  netbox: { asset: { src: netbox } },
  "oauth2-proxy": { asset: { src: oauth2Proxy } },
  phoenix: { asset: { src: phoenix } },
  postgrest: { asset: { src: postgrest, lightBackground: true } },
  redpanda: { asset: { src: redpanda } },
  seaweedfs: { asset: { src: seaweedfs } },
  telegraf: { asset: { src: telegraf } },
  tempo: { asset: { src: tempo } },
  valkey: { asset: { src: valkey } },
  zammad: { asset: { src: zammad } },
};

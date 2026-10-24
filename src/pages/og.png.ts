import type { APIRoute } from "astro";
import satori from "satori";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { fontData, experimental_getFontFileURL } from "astro:assets";
import { getFontPathByWeight } from "@/utils/getFontPathByWeight";
import config from "@/config";

export const GET: APIRoute = async context => {
  const fonts = fontData["--font-google-sans-code"];
  const regular = getFontPathByWeight(fonts, 400);
  const bold = getFontPathByWeight(fonts, 700);
  if (!regular || !bold) throw new Error("Cannot find the font path.");
  const [regularData, boldData, avatar] = await Promise.all([
    fetch(experimental_getFontFileURL(regular, context.url)).then(res =>
      res.arrayBuffer()
    ),
    fetch(experimental_getFontFileURL(bold, context.url)).then(res =>
      res.arrayBuffer()
    ),
    readFile("public/apple-touch-icon.png"),
  ]);
  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 74,
          width: "100%",
          height: "100%",
          padding: 96,
          background: "#fbfcf6",
          color: "#263c5b",
          fontFamily: "Google Sans Code",
          borderBottom: "12px solid #cceea0",
        },
        children: [
          {
            type: "img",
            props: {
              src: `data:image/png;base64,${avatar.toString("base64")}`,
              width: 240,
              height: 240,
              style: { borderRadius: 40 },
            },
          },
          {
            type: "div",
            props: {
              style: { display: "flex", flexDirection: "column", gap: 22 },
              children: [
                {
                  type: "span",
                  props: {
                    style: { fontSize: 18, color: "#426938" },
                    children: "@LYF0422",
                  },
                },
                {
                  type: "span",
                  props: {
                    style: { fontSize: 54, fontWeight: 700, letterSpacing: -2 },
                    children: config.site.title,
                  },
                },
                {
                  type: "span",
                  props: {
                    style: { fontSize: 20, color: "#687580" },
                    children: new URL(config.site.url).hostname,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      embedFont: true,
      fonts: [
        {
          name: "Google Sans Code",
          data: regularData,
          weight: 400,
          style: "normal",
        },
        {
          name: "Google Sans Code",
          data: boldData,
          weight: 700,
          style: "normal",
        },
      ],
    }
  );
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};

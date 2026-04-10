// netlify/functions/api.mjs
export default async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/api/kela") {
    return Response.json({ msg: "Api is running on server" });
  }

  if (path === "/api/mango") {
    return Response.json({ msg: "this is the endpoint of Api" });
  }

  return Response.json({ error: "Not found" }, { status: 404 });
};

export const config = {
  path: ["/api/kela", "/api/mango"],
};

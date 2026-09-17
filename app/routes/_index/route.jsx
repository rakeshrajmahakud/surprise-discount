import { redirect } from "react-router";

export const loader = ({ request }) => {
  const url = new URL(request.url);
  const params = url.searchParams.toString();

  throw redirect(params ? `/app?${params}` : "/app");
};

export default function RootRedirect() {
  return null;
}

import { NextRequest, NextResponse } from "next/server";

const QB_READER_API_URL = "https://www.qbreader.org/api/query";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json(
      { error: "Missing query parameter" },
      { status: 400 }
    );
  }

  const qbUrl = new URL(QB_READER_API_URL);

  qbUrl.searchParams.set("queryString", query);
  qbUrl.searchParams.set("questionType", "all");
  qbUrl.searchParams.set("searchType", "all");
  qbUrl.searchParams.set("exactPhrase", "false");
  qbUrl.searchParams.set("caseSensitive", "false");

  const response = await fetch(qbUrl.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "QBReader request failed" },
      { status: response.status }
    );
  }

  const data = await response.json();

  return NextResponse.json({
  tossups:
    data.tossups?.questionArray?.slice(0, 10) ?? [],
});
}
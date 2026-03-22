import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    
    const userId = auth.userId;
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    
    if (!clientId) {
       return NextResponse.json({ error: "LINKEDIN_CLIENT_ID not configured" }, { status: 500 });
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/social/integrations/linkedin/callback`;
    const state = Buffer.from(userId).toString('base64');
    
    const scopePrompt = encodeURIComponent('w_member_social r_basicprofile');
    
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopePrompt}&state=${state}`;
    
    return NextResponse.redirect(url);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

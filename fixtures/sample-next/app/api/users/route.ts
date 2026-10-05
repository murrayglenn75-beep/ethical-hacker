import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ai = new OpenAI({apiKey: process.env.OPENAI_API_KEY})
export async function GET(){ return Response.json({ok:true}) }

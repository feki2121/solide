import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
const input=z.object({name:z.string().min(1),country:z.string().optional(),seed:z.number().int().optional()})
export async function GET(){return NextResponse.json(await prisma.candidate.findMany({orderBy:{seed:'asc'}}))}
export async function POST(request:Request){try{const user=await requireUser(request as any,'ADMIN');const data=input.parse(await request.json());const candidate=await prisma.candidate.create({data});await prisma.auditLog.create({data:{userId:user.id,action:'candidate creation',entityId:candidate.id}});return NextResponse.json(candidate,{status:201})}catch(e){return NextResponse.json({error:'Accès refusé ou données invalides'},{status:400})}}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Supabase 클라이언트 생성
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase 설정이 필요합니다' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const data = await request.json();
    const {
      name,
      category,
      address,
      description,
      features,
      tags,
      operating_hours,
      contact_info,
      ai_generated_description,
      description_model,
      search_keywords,
      images,
      is_active = true, // 기본값
      parking_info,
      entrance_fee,
      region,
      recommended_duration,
    } = data;

    // AI 이미지 URL을 main_image_url과 image_urls에 설정
    const mainImageUrl = images && images.length > 0 ? images[0].url : '';
    const additionalImageUrls = images && images.length > 1 
      ? images.slice(1).map((img: any) => img.url) 
      : [];

    // 1. tourist_attractions 테이블에 기본 정보 저장
    const { data: attraction, error: attractionError } = await supabase
      .from('tourist_attractions')
      .insert({
        name,
        category,
        address,
        description,
        features,
        tags,
        operating_hours,
        contact_info,
        ai_generated_description,
        description_model,
        description_generated_at: new Date().toISOString(),
        meta_description: description?.substring(0, 160),
        search_keywords,
        main_image_url: mainImageUrl,  // AI 생성 이미지 중 첫 번째를 대표 이미지로
        image_urls: additionalImageUrls, // 나머지 이미지들
        is_active,
        parking_info,
        entrance_fee,
        region,
        recommended_duration,
      })
      .select()
      .single();

    if (attractionError) {
      console.error('Attraction insert error:', attractionError);
      return NextResponse.json({ error: '관광지 저장 실패' }, { status: 500 });
    }

    // 2. tourist_attraction_images 테이블에 이미지 정보 저장
    if (images && images.length > 0) {
      const imageRecords = images.map((img: any, index: number) => ({
        attraction_id: attraction.id,
        url: img.url,
        thumbnail_url: img.thumbnailUrl || img.url,
        display_order: index,
        is_primary: img.isMain || index === 0,
        is_ai_generated: true,
        model: img.model,
        prompt: img.prompt,
      }));

      const { error: imagesError } = await supabase
        .from('tourist_attraction_images')
        .insert(imageRecords);

      if (imagesError) {
        console.error('Images insert error:', imagesError);
        // 이미지 저장 실패해도 계속 진행
      }
    }

    // 3. AI 생성 이력 저장
    const { error: historyError } = await supabase
      .from('ai_generation_history')
      .insert({
        attraction_id: attraction.id,
        original_prompt: name,
        keywords: search_keywords,
        text_model: description_model,
        image_model: images?.[0]?.model || 'flux-schnell',
        generation_result: {
          description: ai_generated_description,
          images: images?.map((img: any) => ({
            url: img.url,
            prompt: img.prompt,
          })),
        },
      });

    if (historyError) {
      console.error('History insert error:', historyError);
      // 이력 저장 실패해도 계속 진행
    }

    return NextResponse.json({ 
      success: true, 
      attraction: attraction 
    });
  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json({ error: '저장 중 오류가 발생했습니다' }, { status: 500 });
  }
}

// GET: 관광지 목록 조회
export async function GET(request: NextRequest) {
  try {
    // Supabase 클라이언트 생성
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase 설정이 필요합니다' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { searchParams } = new URL(request.url);
    
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('tourist_attractions')
      .select(`
        *,
        tourist_attraction_images(
          id,
          url,
          thumbnail_url,
          is_primary
        )
      `, { count: 'exact' });

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Fetch error:', error);
      return NextResponse.json({ error: '조회 실패' }, { status: 500 });
    }

    return NextResponse.json({
      attractions: data,
      total: count,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Get error:', error);
    return NextResponse.json({ error: '조회 중 오류가 발생했습니다' }, { status: 500 });
  }
}

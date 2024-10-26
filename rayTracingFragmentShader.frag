struct Material{
    vec3 color;
};


struct Hit{
   bool hh;
   vec3 hp;
   vec3 n;
   float t;
   Material material;
};

struct Plane{
    vec3 origin;
    vec3 normal;
    Material material;
};


struct Triangle{
    vec3 a, b, c, n;
    Material material;
};

vec3 triangleNormal(vec3 a, vec3 b, vec3 c ){
    return -normalize( cross( b-a, c-a ) );
}

vec3 triangleNormal(Triangle tri){
   return triangleNormal(tri.a, tri.b, tri.c);
}

Triangle buildTriangle(vec3 a, vec3 b, vec3 c, vec3 color){
    Material mater = Material( color  );
    return Triangle( a, b, c, triangleNormal(a, b, c), mater );
}

Hit rayTraceTriangle( vec3 ro, vec3 rd, Triangle tri ){
    Hit hit;
    hit.hh = false;
    mat3 A = mat3(  tri.b-tri.a, tri.c - tri.a, -rd );
    vec3 K = ro - tri.a;
    vec3 coefs = inverse(A) * K; // (B, G, t)
    hit.hh = (coefs.x + coefs.y) < 1. && coefs.x > 0. && coefs.y > 0. && coefs.z > 0.;
    hit.t = coefs.z;
    hit.hp = ro + rd * hit.t;
    hit.n = tri.n;
    hit.material.color = tri.material.color;
    return hit;

}

Hit rayTracePlane(vec3 ro, vec3 rd, Plane plane){
    Hit hit;
    hit.hh = false;

    float t = -dot(plane.normal, ro-plane.origin)/(dot(plane.normal,rd));
    if(t>0.){
        hit.hh= true;
        hit.n = plane.normal;
        hit.material = plane.material;
        hit.t = t;
        hit.hp = ro + rd * t;
    }
    return hit;
}

Triangle rotateTriangle(Triangle tri, float yAngle){
    mat3 rotMat = mat3( vec3( cos(yAngle), 0., -sin(yAngle) ),
        vec3( 0., 1., 0. ), vec3( sin(yAngle), 0., cos(yAngle) )
    );
    
    Triangle rotTri;
    rotTri.a = tri.b + rotMat * (tri.a - tri.b);
    rotTri.c = tri.b + rotMat * (tri.c - tri.b);
    rotTri.b = tri.b;
    rotTri.n = triangleNormal( rotTri );
    rotTri.material = tri.material;
    
    return rotTri;
}

float light( vec3 ls, vec3 ro, Hit hit ){
    float kd = 1.;
    float ks = 1.;
    float p = 10.;
    
    
    vec3 l = normalize(ls - hit.hp);
    vec3 v = normalize(ro - hit.hp);
    
    
    vec3 h = normalize(v+l);
    
    float L = ks * max(0., dot(hit.n, l)) + kd * pow(max(0., dot(hit.n, h)), p);
    return L;
}


Hit rayTraceScene(vec3 ro, vec3 rd){
    float z = 1. + abs(sin(iTime)*2.);
    Triangle tri = buildTriangle( vec3(-.8, -.8, z), 
        vec3(0., .8, z), vec3(.8, -.8, z), vec3(1., 0., 1.)
    );
    
    tri = rotateTriangle(tri, iTime);
    
    Plane plane = Plane( vec3(0., -1., 0.), vec3(0., 1., 0.), 
            Material( vec3(1., 0., 0.) ) );
            
    Hit triHit = rayTraceTriangle(ro, rd, tri);
    Hit planeHit = rayTracePlane(ro, rd, plane);
    
    Hit hit;
    hit.hh = false;
    if(triHit.hh && planeHit.hh){
        if(triHit.t < planeHit.t){
             hit = triHit;
        }else{
            hit = planeHit;
        }
    }else if(triHit.hh){
        hit = triHit;
    }else if(planeHit.hh){
        hit = planeHit;
    }
    
    return hit;
    
    
}



void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy * 2. - 1.;
    
    vec3 ro = vec3(0.);
    vec3 rd = normalize( vec3(uv, 1.) );
    
    vec3 ls = vec3(0., 1., 0.);
    
    Hit hit = rayTraceScene( ro, rd );
    if(hit.hh){
        fragColor = vec4( hit.material.color * light(ls, ro, hit), 1. );
    }
    
    
}
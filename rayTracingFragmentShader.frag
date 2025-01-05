struct Material{
    vec3 color;
    bool reflectColor;
};


struct Hit{
   bool hh;
   vec3 hp;
   vec3 n;
   float t;
   Material material;
};

struct Sphere{
    vec3 c;
    float r;
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
    Material mater = Material( color, false  );
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
    hit.material = tri.material;
 
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

Hit rayTraceSphere(vec3 ro, vec3 rd, Sphere sphere){
    Hit hit;
    hit.hh = false;
    
    
    float A = dot(rd, rd);
    float B = 2. * dot(ro - sphere.c, rd);
    float C = dot(sphere.c - ro, sphere.c - ro) - sphere.r * sphere.r;
    
    float D = pow(B, 2.) - 4. * A * C;
    
    if(D > 0.){
        float t1 = max(0., (-B + sqrt(D))/(2. * A));
        float t2 = max(0., (-B - sqrt(D))/(2. * A));
        float t = min(t1, t2);
        
        if(t > 0.){
            hit.t = t;
            hit.hh = true;
            hit.hp = ro + rd * t;
            hit.n = normalize( hit.hp - sphere.c );
            hit.material = sphere.material;
        }
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
    float kd = 2.;
    float ks = 1.5;
    float p = 1.;
    
    
    vec3 l = normalize(ls - hit.hp);
    vec3 v = normalize(ro - hit.hp);
    
    
    vec3 h = normalize(v+l);
    
    float L = ks * max(0., dot(hit.n, l)) + kd * pow(max(0., dot(hit.n, h)), p);
    return L;
}


Hit rayTraceScene1(vec3 ro, vec3 rd){
    float z = 5.;
   // Triangle tri = buildTriangle( vec3(-.8, -.8, z), 
        //vec3(0., .8, z), vec3(.8, -.8, z), vec3(1., 0., 1.)
    //);
    
    //tri = rotateTriangle(tri, iTime);
    
    Plane plane = Plane( vec3(0., -2., 0.), vec3(0., 1., 0.), 
            Material( vec3(.1), true ) );
            
    Sphere sphere = Sphere( vec3(cos(iTime)*3., 1., z), 1.5, Material(vec3(0., 0., 1.), false) );
            
    //Hit triHit = rayTraceTriangle(ro, rd, tri);
    Hit planeHit = rayTracePlane(ro, rd, plane);
    Hit sphereHit = rayTraceSphere(ro, rd, sphere);
    
    Hit hit;
    hit.hh = false;
    if(sphereHit.hh && planeHit.hh){
        if(sphereHit.t < planeHit.t){
             hit = sphereHit;
        }else{
            hit = planeHit;
        }
    }else if(sphereHit.hh){
        hit = sphereHit;
    }else if(planeHit.hh){
        hit = planeHit;
    }
    
    return hit;
}



Hit reflection(vec3 rd, Hit hit, float eps){
    rd = rd - 2.*dot(rd, hit.n)*hit.n;
    vec3 ro = hit.hp + hit.n * eps;
    rd.x *= iResolution.y/iResolution.x;
    
    Hit reflectionHit = rayTraceScene1(ro, rd);
    if(!reflectionHit.hh){ reflectionHit.material.color = vec3(0.); }
    
    return reflectionHit;
}

float shadow(vec3 ls, Hit hit, float eps){
    vec3 l = normalize( ls - hit.hp );
    vec3 ro = hit.hp + hit.n * eps;
    vec3 rd = l;
    
    Hit shadowHit = rayTraceScene1( ro, rd );
    return 1.-float(shadowHit.hh);
}

vec4 scene1(vec3 ro, vec3 rd){
    vec3 ls = vec3(0., 5., 4.*cos(iTime));
    
    Hit hit = rayTraceScene1( ro, rd );
    if(hit.hh){
        if(hit.material.reflectColor){
            Hit reflectionHit = reflection( rd, hit, 0.01 );
            hit.material.color += 1.*reflectionHit.material.color;
        }
        
        

        return vec4( (hit.material.color) * light(ls, ro, hit) * shadow(ls, hit, .01), 1. );
    }else{
        return vec4(1.);
    }
}

float random(vec2 uv) {
    // Dot product introduces variety in seed
    float dotProduct = dot(uv, vec2(12.9898, 78.233));
    // Use sin and fract for randomness
    return fract(sin(dotProduct) * 43758.5453123);
}

vec3 randomOnHemisphere(vec3 normal){
    vec3 v = vec3( random( normal.xy ), random( normal.xz ), random( normal.zy ) );
    v = normalize(v);
    if(dot(normal, v)<0.){
        return -v;
    }
    return v;
}


vec4 scene2(vec3 ro, vec3 rd, const int c){

    
    Plane plane = Plane( vec3(0., -1., 0.), normalize(vec3(1., 1., 0.)), 
            Material( vec3(.1), true ) );
            
    Sphere sphere = Sphere( vec3(0., 1., 2.), 1.5, Material(vec3(0., 0., 1.), false) );

    
    
    
    for(int i=0;i<c;i++){
        Hit hit;
        hit.hh = false;
        Hit planeHit = rayTracePlane(ro, rd, plane);
        Hit sphereHit = rayTraceSphere(ro, rd, sphere);
        if(sphereHit.hh && planeHit.hh){
            if(sphereHit.t < planeHit.t){
                 hit = sphereHit;
            }else{
                hit = planeHit;
            }
        }else if(sphereHit.hh){
            hit = sphereHit;
        }else if(planeHit.hh){
            hit = planeHit;
        }
        
        if(hit.hh==true){
            ro = hit.hp;
            rd = randomOnHemisphere(hit.n);
        }else{
            
            float a = 0.5*(rd.y + 1.0);
            return vec4((1.0-a)*vec3(1.0, sin(iTime), cos(iTime)) + a*vec3(0.5, 0.7*cos(iTime), 1.0), 1.);
        }
    }
    
    return vec4(0.,0.,0.,1.);
    
    
    
    
    
}


void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy * 2. - 1.;
    uv.x *= iResolution.x/iResolution.y;
    vec3 ro = vec3(0., 0., -2.);
    vec3 rd = vec3(0.);
    
    vec4 c = vec4(0.);
    vec2 s = vec2(-.001,-.001);
    const int ss = 5;
    for(int i=0; i<ss;i++){
        c+=scene2(ro, normalize( vec3(uv+s*(float(i)+1.), 1.)  ), 3);
    }

    
  
    
    fragColor = c/float(ss);
    
    
}

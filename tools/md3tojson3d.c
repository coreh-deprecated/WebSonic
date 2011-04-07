#include <stdio.h>
#include <stdlib.h>
#include <math.h> 

typedef unsigned char U8;
typedef signed short int S16;
typedef signed long int S32;
typedef unsigned long int U32;
typedef float F32;
typedef struct { F32 x; F32 y; F32 z; } VEC3;

#define MAX_QPATH 64
#define MD3_XYZ_SCALE (1.0/64)

typedef struct MD3 {
	S32 ident;
	S32 version;
	U8 name[MAX_QPATH];
	S32 flags;
	S32 numFrames;
	S32 numTags;
	S32 numSurfaces;
	S32 numSkins;
	S32 offsetFrames;
	S32 offsetT0ags;
	S32 offsetSurfaces;
	S32 offsetEOF;
} MD3;

typedef struct Frame {
	VEC3 minBounds;
	VEC3 maxBounds;
	VEC3 localOrigin;
	F32 radius;
	U8 name[16];
} Frame;

typedef struct Surface {
	U32 ident;
	U8 name[MAX_QPATH];
	S32 flags;
	S32 numFrames;
	S32 numShaders;
	S32 numVerts;
	S32 numTriangles;
	S32 offsetTriangles;
	S32 offsetShaders;
	S32 offsetSt;
	S32 offsetXYZNormal;
	S32 offsetEnd;
} Surface;

typedef struct Triangle {
	S32 v1;
	S32 v2;	
	S32 v3;
} Triangle;

typedef struct TexCoord {
	F32 s;
	F32 t;
} TexCoord;

typedef struct Vertex {
	S16 x;
	S16 y;
	S16 z;
	S16 normal;
} Vertex;

int main (int argc, char **argv){
	if (argc != 2) {
		printf("usage: %s [FILENAME]\n", argv[0]);
	} else {
		FILE * file = fopen(argv[1], "rb");
		if (!file) {
			fprintf(stderr, "Error: Cannot find source file\n");
			exit(-1);
		}		
		MD3 md3;
		
		if (!fread(&md3, sizeof(MD3), 1, file)) {
			fprintf(stderr, "Error: Cannot read source file (unexpected end of file)\n");
			exit(-1);
		}
		
		if (md3.ident != 0x33504449) {
			fprintf(stderr, "Error: File is not a valid MD3 mesh.\n");
			exit(-1);
		}
		
		printf("{\n");
		printf("\"format\": \"JSON3D 1.0\",\n");
		printf("\"surfaces\": [\n");

		int lastOffset = md3.offsetSurfaces;
		fseek(file, lastOffset, SEEK_SET);
		for (int i = 0; i < md3.numSurfaces; i++) {
			Surface surface;
			if (!fread(&surface, sizeof(Surface), 1, file)) {
				fprintf(stderr, "Error: Cannot read source file (unexpected end of file)\n");
				exit(-1);
			}
			printf("{\n");
			printf("\"name\": \"%s\",\n", surface.name);
			
			Vertex *vertices = malloc(sizeof(Vertex) * surface.numVerts * surface.numFrames);
			Triangle *tris = malloc(sizeof(Triangle) * surface.numTriangles);
			TexCoord *texCoords = malloc(sizeof(TexCoord) * surface.numVerts);			
			fseek(file, lastOffset + surface.offsetXYZNormal, SEEK_SET);
			if (fread(vertices, sizeof(Vertex), surface.numVerts * surface.numFrames, file) < surface.numVerts * surface.numFrames) {
				fprintf(stderr, "Error: Cannot read source file (unexpected end of file)\n");
				exit(-1);				
			}
			fseek(file, lastOffset + surface.offsetTriangles, SEEK_SET);			
			if (fread(tris, sizeof(Triangle), surface.numTriangles, file) < surface.numTriangles) {
				fprintf(stderr, "Error: Cannot read source file (unexpected end of file)\n");
				exit(-1);				
			}
			fseek(file, lastOffset + surface.offsetSt, SEEK_SET);			
			if (fread(texCoords, sizeof(TexCoord), surface.numVerts, file) < surface.numVerts) {
				fprintf(stderr, "Error: Cannot read source file (unexpected end of file)\n");
				exit(-1);				
			}
			printf("\"frames\": [\n");
			for (int f = 0; f < surface.numFrames; f++) {
				printf("{\n");
				printf("\"vertices\": [\n");
				for (int j = 0; j < surface.numTriangles; j++) {
					printf("%.1f, %.1f, %.1f,\n", vertices[surface.numVerts * f + tris[j].v1].x * MD3_XYZ_SCALE,  vertices[surface.numVerts * f + tris[j].v1].z * MD3_XYZ_SCALE,  vertices[surface.numVerts * f + tris[j].v1].y * MD3_XYZ_SCALE);
					printf("%.1f, %.1f, %.1f,\n", vertices[surface.numVerts * f + tris[j].v3].x * MD3_XYZ_SCALE,  vertices[surface.numVerts * f + tris[j].v3].z * MD3_XYZ_SCALE,  vertices[surface.numVerts * f + tris[j].v3].y * MD3_XYZ_SCALE);					
					printf("%.1f, %.1f, %.1f,\n", vertices[surface.numVerts * f + tris[j].v2].x * MD3_XYZ_SCALE,  vertices[surface.numVerts * f + tris[j].v2].z * MD3_XYZ_SCALE,  vertices[surface.numVerts * f + tris[j].v2].y * MD3_XYZ_SCALE);
				}
				printf("], \n");

				printf("\"normals\": [\n");
				for (int j = 0; j < surface.numTriangles; j++) {				
					float lat, lng, x, y, z;
					lat = ((vertices[surface.numVerts * f + tris[j].v1].normal >> 8) & 255) * (2 * 3.14159265) / 255.0;
					lng = (vertices[surface.numVerts * f + tris[j].v1].normal & 255) * (2 * 3.14159265) / 255.0;
					x = cos( lat ) * sin( lng );
					y = sin( lat ) * sin( lng );
					z = cos( lng );
					
					printf("%.2f, %.2f, %.2f,\n", x, z, y);
	
					lat = ((vertices[surface.numVerts * f + tris[j].v3].normal >> 8) & 255) * (2 * 3.14159265) / 255.0;
					lng = (vertices[surface.numVerts * f + tris[j].v3].normal & 255) * (2 * 3.14159265) / 255.0;
					x = cos( lat ) * sin( lng );
					y = sin( lat ) * sin( lng );
					z = cos( lng );
					printf("%.2f, %.2f, %.2f,\n", x, z, y);
	
					lat = ((vertices[surface.numVerts * f + tris[j].v2].normal >> 8) & 255) * (2 * 3.14159265) / 255.0;
					lng = (vertices[surface.numVerts * f + tris[j].v2].normal & 255) * (2 * 3.14159265) / 255.0;
					x = cos( lat ) * sin( lng );
					y = sin( lat ) * sin( lng );
					z = cos( lng );
				
					printf("%.2f, %.2f, %.2f,\n", x, z, y);
				

				}
				printf("] \n");
				printf("},\n");
			}
			printf("],\n");
			printf("\"textureCoordinates\": [\n");
			for (int j = 0; j < surface.numTriangles; j++) {
				printf("%f, %f,\n", texCoords[tris[j].v1].s, texCoords[tris[j].v1].t);
				printf("%f, %f,\n", texCoords[tris[j].v3].s, texCoords[tris[j].v3].t);
				printf("%f, %f,\n", texCoords[tris[j].v2].s, texCoords[tris[j].v2].t);
			}
			printf("]\n");
			free(tris);
			free(vertices);
			
			if (i == md3.numSurfaces - 1) {
				printf("}\n");
			} else {
				printf("},\n");
			}
			
			lastOffset += surface.offsetEnd;
			fseek(file, lastOffset, SEEK_SET);
		}
		
		printf("]\n");
		printf("}\n");
		
		fclose(file);
	}
}
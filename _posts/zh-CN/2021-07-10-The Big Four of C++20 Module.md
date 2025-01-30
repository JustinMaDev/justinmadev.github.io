---
layout: post
title: C++20四大之一：module特性详解
lang: zh-CN
---

# <center> 前言 </center>
C++20最大的特性是什么？
——最大的特性是迄今为止没有哪一款编译器完全实现了所有特性。

![](/assets/images/20210710_1.png)
C++20标准早已封版，各大编译器也都已支持了C++20中的多数特性，但迄今为止（2021.7），尚未有哪一款编译器完整支持C++20中的所有特性。有人认为C++20是C++11以来最大的一次改动，甚至比C++11还要大。
本文仅介绍C++20四大特性当中的module部分。全文分为三章：第一章探究C++编译连接模型的由来以及利弊、第二章介绍C++20 module机制的使用姿势、第三章总结module背后的机制、利弊、以及各大编译器的支持情况。

<!--more--> 

# <center> （一）扒一扒头文件的由来
>* 1，C++是兼容C的：不但兼容了C的语法，也兼容了C的编译链接模型
>* 2，1973年初，C语言基本定型：有了预处理、支持结构体；编译模型也基本定型为：预处理、编译、汇编、链接四个步骤并沿用至今；1973年，K&R二人使用C语言重写了Unix内核。
>* 3，为何要有预处理？为何要有头文件？
>* 4，在C的诞生的年代，用来跑C编译器的计算机PDP-11的硬件配置如下：
内存：64 KiB
硬盘：512 KiB
编译器无法把较大的源码文件放入狭小的内存，故当时的C编译器设计目标是能够支持模块化编译（将源码分成多个源码文件，挨个编译）、生成多个目标文件，最后整合（链接）成一个可执行文件。
C编译器分别编译多个源码文件的过程，实际上是一个One pass compile，即：从头到尾扫描一遍源码、边扫描边生成目标文件、过眼即忘（以源码文件为单位）、后面的代码不会影响编译器前面的决策，该特性导致了C语言的以下特征：
A: 结构体必须先定义再使用：否则无法知道成员的类型以及偏移，无法生成目标代码
B: 局部变量先定义再使用，否则无法知道变量的类型以及在栈中的位置。且为了方便编译器管理栈空间，局部变量必须定义在语句块的开始处。
C: 外部变量，只需要知道类型、名字（二者合起来便是声明）即可使用（生成目标代码），外部变量的实际地址由连接器填写
D: 外部函数，只需知道函数名、返回值、参数类型列表（函数声明）即可生成调用函数的目标代码，函数的实际地址由连接器填写。
>* 5 头文件和预处理恰好满足了上述要求：头文件只需用少量的代码，声明好函数原型、结构体等信息，编译时将头文件展开到实现文件中，编译器即可完美执行One pass comlile过程了。

至此，我们看到的都是头文件的必要性、益处，头文件也有很多负面影响：
>* 低效。头文件的本职工作是提供前置声明，而提供前置声明的方式采用了文本拷贝，文本拷贝过程不带有语法分析，会一股脑将需要的、不需要的声明全部拷贝到源文件中。
>* 传递性。最底层的头文件中宏、变量等实体的可见性，可以通过中间头文件“透传”给最上层的头文件，这种透传会带来很多麻烦。
>* 降低编译速度。加入a.h被三个模块包含，则a会被展开3次、编译三次。
>* 顺序相关。程序的行为受头文件的包含顺影响，也受是否包含某一个头文件影响，在C++中尤为严重（重载）
>* 不确定性。同一个头文件在不同的源文件中可能表现出不同的行为。导致这些这些不同的原因，可能源自源文件（比如该源文件包含的其他头文件、该源文件中定义的宏等），也可能源自编译选项。
>* 头文件天然的迫使程序员将声明与实现放在不同的文件，有利于践行“接口与实现分离”，但同时容易引发接口与实现不一致的情况。

C++20中，加入了module。我们先看module 的基本使用姿势，最后再总结module比header的优势。
# <center> (二)module的使用
###### 2.1 实现一个最简单的module
module_hello.cppm：定义一个完整的**hello**模块，并导出一个**say_hello_to**方法给外部使用。当前各编译器并未规定模块文件的后缀，本文统一使用".cppm"后缀名。".cppm"文件有一个专用名称"模块接口文件"，值得注意的是，该文件不光可以声明实体，也可定义实体。
~~~cpp
//module_hello.cppm
export module hello;
import <iostream>;
import <string_view>;
void internal_helper(){
	//do something;
}
export void say_hello_to(const std::string_view& something){
	internal_helper();
	std::cout<<"Hello "<<something<<" !"<<std::endl;
	return;
}
~~~
main函数中可以直接使用hello模块：
~~~cpp
//main.cpp
import hello;
import <string_view>;

int main(){
	say_hello_to(std::string_view{"Netease"});
	internal_helper();//error
	return 0;
}
~~~
编译脚本如下，需要先编译module_hello.cppm生成一个pcm文件（module缓存文件），该文件包含了hello模块导出的符号。
~~~sh
#buildfile.sh
CXX="clang -fmodules-ts -std=c++2a"
$CXX -o module_hello.pcm --precompile -x c++-module module_hello.cppm
$CXX -o hello -fprebuilt-module-path=. main.cpp hello.cpp
~~~
以上代码有以下细节需要注意：
>* module hello; 声明了一个模块，前面加一个export，则意味着当前文件是一个模块接口文件（module interface file），只有在模块接口文件中可以导出实体（变量、函数、类、namespace等）。一个模块至少有一个模块接口文件、模块接口文件可以只放实体声明，也可以放实体定义。
>* 想要导出一个函数，在函数定义/声明前加一个export关键字即可。
>* import hello；不需加尖括号。且不同于include，import 后跟的不是文件名，而是模块名（文件名为module_hello.cpp）。编译器并未强制模块名必须与文件名一致。
>* import的模块不具有传递性。hello模块包含了string_view，但是main函数在使用hello模块前，依然需要再import  <string_view>;
>* 模块中的import声明需要放在模块声明之后、模块内部其他实体声明之前。即：import <iostream>;必须放在export module hello;之后、void internal_helper()之前
>* 编译时需要先编译基础的模块，再编译上层模块。buildfile.sh中先将module_hello编译为pcm，再编译main。
>* module_hello.cppm中并未包含**say_hello_to**函数的声明，而是直接定义实现。编译器会将函数原型等信息放在module_hello.pcm中。

###### 2.2 接口与实现分离
当模块的规模变大、接口变多之后，将所有的实体定义都放在模块接口文件中会非常不利于代码的维护，C++20的模块机制还支持接口与实现分离。
module_hello.cppm：我们假设say_hello_to、func_a、func_b等函数十分复杂，.cppm文件中只包含函数的声明（square方法是个例外，它是函数模板，只能定义在.cppm中，不能分离式编译）
~~~cpp
//module_hello.cppm
export module hello;
import <iostream>;
import <string_view>;

void internal_helper();

export void say_hello_to(const string_view&);
//缩写的函数模板，C++20新糖果
export auto square(const auto& x){
	return x*x;
}
export void func_a();
export void func_b();
~~~
module_hello.cpp：给出hello模块的各个函数声明对应的实现。
~~~cpp
//module_hello.cpp
module hello;
void internal_helper(){
	//do something;
}
void say_hello_to(const string_view&){
	internal_helper();
	std::cout<<"Hello "<<something<<" !"<<std::endl;
	return;
}
void func_a(){
	//do something;
}
void func_b(){
	//do something;
}
~~~
以上代码有以下细节需要注意：
>* 整个hello模块分成了 module_hello.cppm和module_hello.cpp两个文件，前者是模块接口文件(module声明前有export关键字)，后者是模块实现文件（module implementation file）。当前各大编译器并未规定模块接口文件的后缀必须是cppm。
>* 模块实现文件中不能export任何实体。
>* 函数模板，比如代码中的square函数，定义必须放在模块接口文件中，使用auto返回值的函数，定义也必须放在模块接口文件。

###### 2.3 可见性控制
在模块的最开始的例子中，我们就提到了模块的import不具有传递性：
main函数使用hello模块的时候必须import <string_view>;。
如果想让 hello模块中的string_view模块透给使用者，需使用export import显式声明：
~~~cpp
//module_hello.cpp
export module hello;
import <iostream>;
export import <string_view>;
.....
~~~
hello模块显示导出**string_view**后，main文件中便无需再包含string_view了。
~~~cpp
//main.cpp
import hello;
//无需再import <string_view>
int main(){
	say_hello_to(std::string_view{"Netease"});
}
~~~
###### 2.4 子模块（submodule）
当模块变得再大一些，仅仅是将模块的接口与实现拆分也有点力不从心：模块实现文件会变得非常大，不便于代码的维护。C++20的模块机制支持子模块。
这次module_hello.cppm文件不再定义、声明任何函数，而是仅仅显式导出hello.sub_a、hello.sub_b两个子模块，外部需要的方法都由上述两个子模块定义，module_hello.cppm充当一个“汇总”的角色。
~~~cpp
//module_hello.cppm
export module hello;
export import hello.sub_a;
export import hello.sub_b;
~~~
子模块module hello.sub_a采用了接口与实现分离的定义方式：“.cppm”中给出定义，“.cpp”中给出实现。
~~~cpp
//module_hello_sub_a.cppm（子模块a的接口文件）
export module hello.sub_a;
export void func_a();
~~~
~~~cpp
//module_hello_sub_a.cpp（子模块a的实现文件）
module hello.sub_a;
void func_a(){
	//do something;
}
~~~
module hello.sub_b同上，不再赘述。
~~~cpp
//module_hello_sub_b.cppm（子模块b的接口文件）
export module hello.sub_b;
export void func_b();
~~~
~~~cpp
//module_hello_sub_b.cpp（子模块b的实现文件）
module hello.sub_b;
void func_b(){
	//do something;
}
~~~
这样，hello模块的接口和实现文件各自被拆分到了两个文件中。值得注意的是，C++20的子模块是一种“模拟机制”，模块hello.sub_b是一个完整的模块，中间的点并不代表语法上的从属关系，不同于函数名、变量名等标识符的命名规则，模块的命名规则中允许点存在于模块名字当中。点只是从逻辑语义上帮助程序员理解模块间的逻辑关系。
###### 2.5 module partition
除了子模块之外，处理复杂模块的机制还有module partition（模块拆分？）
module partition一直没想到一个贴切的中文翻译，下文直接使用module partition。
module partition分为两种：
>* module implementation partition
>* module interface partition

module implementation partition可以通俗的理解为：将模块的实现文件拆分成多个。
module_hello.cppm文件：给出模块的声明、导出函数的声明。
~~~cpp
//module_hello.cppm
export module hello;
export void func_a();
export void func_b();
~~~
模块的一部分实现代码拆分到module_hello_partition_internal.cpp文件，该文件实现了一个内部方法。
~~~cpp
//module_hello_partition_internal.cpp(parititon internal的实现文件，无需给出接口文件)
module hello:internal;
void internal_helper(){
	//do something;
}
~~~
模块的另一部分实现拆分到module_hello.cpp文件，该文件实现了func_a、func_b，同时引用了内部方法internal_helper。（func_a、func_b当然也可以拆分到两个cpp文件中）
~~~cpp
//module_hello.cpp
module hello;
import :internal;
void func_a(){
	internal_helper();
	//....
}
void func_b(){
	internal_helper();
	//....
}
~~~
值得注意的是， 模块内部import 一个module partition时，不能import hello:internal;而是直接import :internal; 。

module interface partition可以理解为模块声明拆分到多个文件中。module implementation partition的例子中，函数声明只集中在一个文件中，module interface partition可以将这些声明拆分到多个文件。

首先定义一个内部helper：internal_helper
~~~cpp
//module_hello_partition_internal.cpp(parititon internal的实现文件，无需给出接口文件)
module hello:internal;
void internal_helper(){
	//do something;
}
~~~
hello模块的a部分采用声明+定义合一的方式，定义在module_hello_partition_a.cppm中：
~~~cpp
//module_hello_partition_a.cppm（partition a的声明+实现）
export hello:partition_a;
export void func_a(){
	//do something;
} 
~~~
hello模块的b部分采用声明+定义分离的方式，module_hello_partition_b.cppm只做声明：
~~~cpp
//module_hello_partition_b.cppm（partition b的声明）
export hello:partition_b;
export func_b();
~~~
module_hello_partition_b.cpp给出hello模块的b部分对应的实现：
~~~cpp
//module_hello_partition_b.cpp（partition b的实现）
module hello;//不能使用module hello:partition_b!!!!!!
void func_b(){
	//do something;
}
~~~
module_hello.cppm再次充当了”汇总“的角色，将模块的a部分+b部分导出给外部使用：
~~~cpp
//module_hello.cppm //primary module interface file
export module hello;
export :partition_a;
export :partition_b;
//export :internal; //编译错误！！！！
~~~
module implementation partition的使用方式较为直观，相当于我们平时编程中“一个头文件声明多个cpp实现”这种情况。module interface partition有点类似于submodule机制，但语法上有较多差异：
>*  module_hello_partition_b.cpp 第一行不能使用 import hello:partition_b;虽然这样看上去更符合直觉，但是，就是不允许。一个partition name只能创建一个文件
>* 每个module partition interface最终必须被primary module interface file导出，不能遗漏。
>* primary module interface file 不能导出module implementation file，只能导出module interface file。故在module_hello.cppm中export :internal;是错误的。

同样作为处理大模块的机制，module partition与子模块最本质的区别在于：
子模块可以独立的被外部使用者import，而module partition只在模块内部可见，外部无法使用。

###### 2.6 全局模块片段（Global module fragments）
C++20之前有大量的不支持模块的代码、头文件，这些代码实际被隐式的当作全局模块片段处理，模块代码与这些片段交互方式如下：
~~~cpp
module; //开启了一个全局模块片段，#include必须出现在该行之后、模块声明之前
#include <cmath>//include一个非模块化的文件
#include <iostream>
export module hello;
export void func_a(){
	//....
}
~~~
事实上，由于标准库的大多数头文件尚未模块化（VS模块化了部分头文件），2.1～2.5章节的代码在当前编译器环境下(Clang12)是不能直接编译通过的——当前尚不能直接import < iostream > 等模块，通全局模块段则可以进行方便的过渡,另一个过渡方案便是下一节所介绍的module map。

##### 2.7 module map
module map机制可以将普通的头文件映射成module，进而可以使旧的代码吃到module机制的红利。下面便以clang13中的module map机制为例。
假设有一个a.h头文件，该头文件历史较久，不支持module：
~~~cpp
// a.h 该头文件历史较为久远
void func_a();
~~~
通过给Clang编译器定义一个**module.modulemap**文件,在该文件中可以将头文件映射成模块：
~~~cpp
// module.modulemap
//改造自定义头文件
module A {
	header "a.h"
	export *
}
//改造C库头文件
module ctype {
    header "ctype.h"
    export *
}
//改造C++标准库头文件
module iostream{
	requires cplusplus //requires cplusplus11 or requires cplusplus17
	header "iostream"	
	export *
}
~~~
~~~cpp
//main.cpp
import A;
import iostream;
int main(){
	func_a();
	std::cout<<"import iostream";
}
~~~
编译脚本需要依次编译A、ctype、iostream三个模块，然后再编译main文件：
~~~sh
//buildfile.sh
clang -cc1 -emit-module -o A.pcm -fmodules module.modulemap -fmodule-name=A
clang -cc1 -emit-module -o ctype.pcm -fmodules module.modulemap -fmodule-name=ctype
clang -cc1 -emit-module -o iostream.pcm -fmodules module.modulemap -fmodule-name=iostream
clang -cc1 -emit-obj main.cpp -fmodules -fmodule-map-file=module.modulemap
-fmodule-file=A=A.pcm
-fmodule-file=iostream=iostream.pcm
~~~
首先使用-fmodule-map-file参数，指定一个module map file，然后通过-fmodule指定map file中定义的module，就可以将头文件编译成pcm。main文件使用A、iostream等模块时，同样需要使用fmodule-map-file参数指定mdule map文件，同时使用-fmodule指定依赖的模块名称。

注：关于module map机制能够查到的资料较少，有些细节笔者也未能一一查明，例如，通过module map将一个头文件模块化之后，头文件中暴露的宏会如何处理？假如头文件声明的实体的实现分散在多个cpp中，该如何组织modulemap编译？
##### 2.8 module 与 namespace
module与namespace是两个维度的概念，在module中同样可以导出namespace：
~~~cpp
//module_hello.cppm
module;
include <iostream>
export module hello;

export namespace hello{
	void say_hello(){
		std::cout<<"hello"<<std::endl;
	}
}
~~~
~~~cpp
//main.cp
import hello;
int main(){
	hello::say_hello();
	return 0;
}
~~~

# <center> (三)总结
最后，对比最开始提到的头文件的缺点，模块机制有以下几点优势：
>* 无需重复编译：一个模块的所有接口文件、实现文件，作为一个翻译单元，一次编译后生成pcm，之后遇到import该模块的代码，编译器会从pcm中寻找函数声明等信息。该特性会极大加快C++代码的编译速度。
>* 隔离性更好。模块内import的内容，不会泄漏到模块外部，除非显式使用export import声明。
>* 顺序无关。import多个模块，无需关心这些模块间的顺序。
>* 减少冗余与不一致。小的模块可以直接在单个cppm文件中完成实体的导出、定义。但大的模块依然会把声明、实现拆分到不同文件。
>* 子模块、module partition等机制让大模块、超大模块的组织方式更加灵活。
>* 全局模块段、module map制使得module与老旧的头文件交互成为可能

缺点也有：
>* 编译器支持不稳定。尚未有编译器完全支持module的所有特性、clang13支持的module map特性不一定保留到主干版本。
>* 编译时需要分析依赖关系、先编译最基础的模块。
>* 现有的C++工程需要重新组织pipline，且尚未出现自动化的构建系统，需要人工根据依赖关系组构建脚本，实施难度巨大

module不能做啥？
>* module不能实现代码的二进制分发。依然需要通过源码分发module
>* pcm文件不能通用，不同编译器的pcm文件不能通用、同一编译器不同参数的pcm不能通用
>* 无法自动构建，现阶段需要人工组织构建脚本


编译器如何实现对外隐藏module内部符号的？
>* 在module机制出现之前，符号的链接性分为外部连接性(external linkage，符号可在文件之间共享)、内部链接性(internal linkage，符号只能在文件内部使用),可以通过extern、static等关键字控制一个符号的链接性。
>* module机制引入了模块链接性(module linkage)，符号可在整个**模块内部**共享(一个模块可能存在多个partition文件)
>* 对于模块export的符号，编译器根据现有规则（外部连接性）对符号进行名称修饰(name mangling)
>* 对于module内部的符号，统一在符号名称前面添加“**_Zw**”名称修饰，这样链接器链接时便不会链接到内部符号。

截至2021.7，三大编译器对module机制的支持情况：

|  |  GCC|Clang|VisualStudio|
|--|--|--|--|
|  支持module的版本| 11(仅部分特性) |12(仅部分特性)|19.28(仅部分特性)|
|支持module map的版本|未查到资料|13|未查到资料|
|module缓存文件类型|.pcm|.gcm|.ifc|
|module接口文件类型|未规定|未规定|未规定|
|模块化STL|暂未提供|暂未提供|部分提供|




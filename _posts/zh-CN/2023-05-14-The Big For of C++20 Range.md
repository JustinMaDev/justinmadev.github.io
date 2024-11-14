---
layout: post
title: C++20四大之Range
lang: zh-CN
---

本文是C++20四大系列的收官之作，不少读者可能会与这样的疑问：位列四大的range是个什么特性？
笔者一开始也有同样的感觉：C++20前三大都是“划时代”的改动：module改变了C++工程的组织模型，coroutine改变了C++并发的实现、concept则是模板编程自存在以来的最大变革，range到底带来了哪些改变，可位列于四大？
因为他改变了循环的方式，或者说，他给循环提供了更高层的抽象

### 什么是Range?
定义了begin()、end()迭代器的就算一个Range. Range共有两大类：Container与View. Container拥有begin() 、end() 所指向的数据，而view不拥有begin() 、end()所指向的数据，view更轻量、易于拷贝、移动。

我们以这样一个操作为例，可以清楚的看清range的面貌：
1，给定一个int数组,挑出其中的偶数
2，将得到的数据平方
3，将这些偶数倒序
~~~cpp
#include <algorithm>
#include <vector>
#include <iostream>

int main() {
    const std::vector<int> numbers = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
    auto even = [](int i) { return 0 == i % 2; };
    auto square = [](int i) { return i * i; };
    
    std::vector<int> temp;    
    std::copy_if(begin(numbers), end(numbers), std::back_inserter(temp), even);
    std::transform(begin(temp), end(temp), begin(temp), square);
    std::vector<int> temp2(rbegin(temp), rend(temp));
    
    for (auto iter = begin(temp2); iter!=end(temp2); ++iter)
        std::cout << *iter << ' ';                                  
}
~~~

在C++20 range之前，我们需要使用copy_if、rbegin等设施来实现以上功能，同时不可避免的，需要中间变量来辅助。下面看下range的做法：

~~~cpp
int main() {
    const std::vector<int> numbers = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
    auto even = [](int i) { return 0 == i % 2; };
    auto square = [](int i) { return i * i; };
    
    std::ranges::reverse_view rv{ 
        std::ranges::transform_view{
            std::ranges::filter_view{ numbers, even }, square
        }
    };
    
    for (const auto& i : rv)
        std::cout << i << ' ';                            
}
~~~
我们从内往外看，range先用filter_view将偶数挑出，然后将得到的结果作为transform_view的输入，进行平方操作，最后将平方操作的结果作为reverse_view的输入，进行倒序。
就易读性而言，个人感觉第一种稍微好于第二种：第一种阅读的顺序(从上到下)与操作的逻辑顺序是一致的，第二种的阅读顺序需要由内到外，才能与逻辑顺序对上。
但是，二者的效率差异却很大：第一种不得不采用temp\temp2等中间变量来保存中间结果，作为下一步操作的输入。而range以及view完全不需要，view不拥有数据，他只是数据的“引用”。
为了缓解range在易读性上的弱势，C++20引入了管道操作符 "|" ：

~~~cpp
int main() {
    const std::vector<int> numbers = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
    auto even = [](int i) { return 0 == i % 2; };
    auto square = [](int i) { return i * i; };
    
    namespace sv = std::views;
    auto result = numbers | sv::filter(even) | sv::transform(square) | sv::reverse;
    
    for (const auto& i : result)
        std::cout << i << ' ';                                
}
~~~
std::ranges::filter_view与std::views::filter在功能上完全一致，只不过std::views::filter可以与管道操作符 "|" 配合使用，使代码在易读性与简洁程度上飙升：我们可以从左到右阅读这几个操作：
将numbers中的数据过滤出偶数，然后平方，然后倒序。
既省略了中间变量，又有着较好的易读性，同时代码简洁程度较之前有了较大提升！

### 懒惰求值
上面三段代码可以让我们快速、直观的感受到range的简洁与高效，View内部只是对源数据的引用，从而避免了数据的拷贝，大大减少了辅助内存的使用。
除了使用引用，另一高效利器便是懒惰求值。
懒惰求值意味着，对view的那些操作仅在必要的时候才会执行，而不是马上全部执行。这些操作会被添加到一个pipline中。当我们遍历最view的时候才会最终执行那些操作，每个元素都会通过pipline进行传递，并返回最终结果。

### 标准库提供的views
|views|作用描述  |
|--|--|
| std::views::all | 从第一个元素开始，drop指定数量的元素，然后返回剩余的元素的view |
|std::views::drop|从第一个元素开始，drop指定数量的元素，然后返回剩余的元素的view|
|std::views::drop_while|从第一个元素开始， 一直drop,直到第一个不满足指定谓词的元素，然后返回剩下的元素的view
|std::views::filter|返回满足指定谓词的所有元素的view|std::views::join相当于把二维数组串成一维数组的一个view|
|std::views::join_with|把二维数组串成一维数组的，并且在串联时安插指定的内容的一个view|
|std::views::reverse|将元素倒序的view|
|std::views::split|用指定的分隔符将一个view分割成多个view，并返回这些view，相当于join_with的逆操作|
|std::views::take|第一个元素开始，take指定数量的元素的view|
|std::views::take_while|第一个元素开始take，直到遇到第一个不满足指定谓词的元素，并返回take的元素的view|
|std::views::transform|返回由指定函数转换的所有元素的view|
|std::views::keys|采用由类似pair的值组成的view，并生成每个pair的第一个元素的view|
|std::views::values|采用由类似pair的值组成的view，并生成每个pair的第二个元素的view|
|std::views::elements|接受tuple-like数据组成的 view 和数值 N ，产生每个 tuple 的第 N 个元素的 view（相当于返回一个二维数组的第N个子数组，不过每个子数组必须是一个tuple）|
|std::views::zip|view::elements的逆操作的view（相当于把多个子数组合并成一个二维数组）|
|std::views::zip_transform|相当于把多个子数组合并成一个数组，合并的方式可以是add等等随意指定|
|std::views::adjacent|相当于返回数组中所有连续N个值的所有组合的view|
|std::views::adjacent_transform|比view::adjacent更进一步，可以指定对连续的N个值的操作，例如addstd::views::slide类似于adjacent，区别在于，adjacent只接受tuple-like的参数，且adjacent的N是编译期指定的，slide接受任何range,且N可以在运行期指定|
|std::views::stride|接受一个view和一个数字 n， 从第一个元素开始，每隔n个元素取一个值|
|std::views::chunk|接受一个view和一个数字 n， 从第一个元素开始，每n个元素作为一个块|
|std::views::counted|类似view::take,区别在于take只能从第一个开始，counted可以指定起始位置|
|std::views::common|把一个non_common_range转换为common_range,例如take_while就不是一个common_range,所以take_while的结果无法被某些算法直接使用|
|std::views::as_const|生成对象的 const view|
|std::views::as_rvalue|生成对象的 rvalue view|

参考资料：

https://www.cppstories.com/2022/ranges-composition/
https://hannes.hauswedell.net/post/2019/11/30/range_intro/
https://itnext.io/c-20-ranges-complete-guide-4d26e3511db0
A beginner's guide to C++ Ranges and Views. // Hannes Hauswedell
